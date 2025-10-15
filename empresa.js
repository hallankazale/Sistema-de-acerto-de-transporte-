// Empresa page logic
document.addEventListener('DOMContentLoaded', () => {
  // Tabs for auth
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const key = t.dataset.tab;
      if (key === 'login') {
        document.getElementById('tab-login').classList.remove('hidden');
        document.getElementById('tab-register').classList.add('hidden');
      } else {
        document.getElementById('tab-register').classList.remove('hidden');
        document.getElementById('tab-login').classList.add('hidden');
      }
    });
  });

  // Buttons
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
  const authCard = document.getElementById('authCard');
  const dash = document.getElementById('dash');
  const tripModal = document.getElementById('tripModal');

  // Autocomplete data for cities (example cities)
  const cities = ["São Paulo/SP", "Rio de Janeiro/RJ", "Belo Horizonte/MG", "Salvador/BA", "Fortaleza/CE", "Curitiba/PR", "Manaus/AM", "Recife/PE", "Brasília/DF", "Porto Alegre/RS", "Natal/RN", "Medianeira/PR"];
  const datalist = document.getElementById('cities');
  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    datalist.appendChild(option);
  });

  btnLogin.onclick = () => {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const db = loadDB();
    const user = db.users.find(u => u.email === email && u.password === password && u.role === 'empresa');
    if (!user) return alert('Credenciais inválidas para Empresa.');
    setSession(user);
    showDash();
  };

  btnRegister.onclick = () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    if (!name || !email || !password) return alert('Preencha nome, email e senha.');
    const db = loadDB();
    if (db.users.some(u => u.email === email)) return alert('Já existe usuário com este email.');
    const user = {
      id: uid(),
      name,
      email,
      password,
      role: 'empresa'
    };
    db.users.push(user);
    saveDB(db);
    alert('Conta criada. Faça login.');
    document.querySelector('.tab[data-tab="login"]').click();
    document.getElementById('loginEmail').value = email;
  };

  btnLogout.onclick = () => {
    clearSession();
    dash.style.display = 'none';
    authCard.style.display = 'block';
  };

  const me = getSession();
  if (me && me.role === 'empresa') {
    showDash();
  }

  function showDash() {
    authCard.style.display = 'none';
    dash.style.display = 'block';
    const me = getSession();
    if (!me) return;
    document.getElementById('meName').innerHTML = `<strong>${me.name}</strong> (${me.email})`;
    renderTrips();
  }

  // Handle main tabs
  document.getElementById('tabsMain').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('#tabsMain .tab').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.tab;
    document.getElementById('tab-nova').classList.add('hidden');
    document.getElementById('tab-gerenciar').classList.add('hidden');
    document.getElementById(`tab-${key}`).classList.remove('hidden');
    if (key === 'gerenciar') {
      renderTrips();
    }
  });


  // Create trip
  document.getElementById('btnCreateTrip').onclick = () => {
    const me = getSession();
    if (!me) return;
    const driverCpf = document.getElementById('tripDriverCpf').value.trim();
    const placa = document.getElementById('tripPlaca').value.trim().toUpperCase();
    const modelo = document.getElementById('tripModelo').value.trim();
    const carga = document.getElementById('tripCarga').value;
    const origem = document.getElementById('tripOrigem').value.trim();
    const destino = document.getElementById('tripDestino').value.trim();
    const dataInicio = document.getElementById('tripInicio').value || todayISO();
    const obs = document.getElementById('tripObs').value.trim();

    if (!driverCpf || !placa || !origem || !destino || !carga) {
      return alert('Preencha todos os campos obrigatórios (CPF, Placa, Carga, Origem, Destino).');
    }

    const db = loadDB();
    const motorista = db.users.find(u => u.cpf === driverCpf && u.role === 'motorista');
    if (!motorista) {
      return alert('Motorista não encontrado com este CPF.');
    }

    const trip = {
      id: uid(),
      empresaId: me.id,
      motoristaId: motorista.id,
      motoristaName: motorista.name,
      motoristaCpf: motorista.cpf,
      truck: {
        placa,
        modelo,
        carga
      },
      rota: {
        origem,
        destino
      },
      dataInicio,
      obs,
      status: 'aberta',
      fretes: [],
      adiantamentos: []
    };
    db.trips.unshift(trip);
    saveDB(db);
    clearTripForm();
    renderTrips();
    alert('Viagem criada.');
  };

  function clearTripForm() {
    ['tripDriverCpf', 'tripPlaca', 'tripModelo', 'tripCarga', 'tripOrigem', 'tripDestino', 'tripObs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('tripInicio').value = '';
    document.getElementById('tripCarga').value = '';
  }

  // Filter trips
  document.getElementById('btnFilterTrips').onclick = () => {
    const filterTerm = document.getElementById('filterDriver').value.trim().toLowerCase();
    renderTrips(filterTerm);
  };

  function renderTrips(filterTerm = null) {
    const db = loadDB();
    const me = getSession();
    if (!me) return;
    const list = document.getElementById('listTrips');
    list.innerHTML = '';

    let trips = db.trips.filter(t => t.empresaId === me.id);
    if (filterTerm) {
      trips = trips.filter(t =>
        (t.motoristaCpf && t.motoristaCpf.toLowerCase().includes(filterTerm)) ||
        t.truck.placa.toLowerCase().includes(filterTerm)
      );
    }

    let totalFretes = 0;
    trips.forEach(t => totalFretes += t.fretes.length);
    document.getElementById('kpiTrips').innerHTML = `<strong>${trips.length}</strong>`;
    document.getElementById('kpiFretes').innerHTML = `<strong>${totalFretes}</strong>`;

    if (trips.length === 0) {
      list.innerHTML = '<p class="small">Nenhuma viagem encontrada.</p>';
      return;
    }
    trips.forEach(t => {
      const {
        totalBruto,
        totalPct,
        totalAdiant,
        totalLiquido
      } = computeResumo(t);
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div>
          <div><strong>${t.motoristaName}</strong> • ${t.truck.placa} • <span class="badge">${t.status}</span></div>
          <div class="small">${t.rota.origem} → ${t.rota.destino} • Início: ${t.dataInicio} • Fretes: ${t.fretes.length}</div>
        </div>
        <div>
          <div class="small">Bruto: ${money(totalBruto)} | % Mot.: ${money(totalPct)} | Adiant.: ${money(totalAdiant)}</div>
          <div><strong>Líquido: ${money(totalLiquido)}</strong></div>
          <div style="margin-top:6px;display:flex;gap:6px">
            <button class="btn" data-open="${t.id}">Abrir</button>
            <button class="btn" data-profile="${t.motoristaId}">Ver Perfil</button>
          </div>
        </div>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openTripModal(b.dataset.open));
    list.querySelectorAll('[data-profile]').forEach(b => b.onclick = () => window.location.href = `motorista-empresa.html?id=${b.dataset.profile}`);
  }

  function openTripModal(tripId) {
    const db = loadDB();
    const t = db.trips.find(x => x.id === tripId);
    if (!t) return;

    const rowsFretes = t.fretes.map((f, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${f.data}</td>
        <td>${f.origem} → ${f.destino}</td>
        <td>${money(f.bruto)}</td>
        <td>${pct(f.pct)}</td>
        <td>${money(f.bruto * (f.pct / 100))}</td>
      </tr>`).join('') || '<tr><td colspan="6">Sem fretes</td></tr>';

    const rowsAd = t.adiantamentos.map((a, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${a.data||''}</td>
        <td>${money(a.valor)}</td>
        <td>${a.obs||''}</td>
        <td>${a.fileName?`<a class="linkable" href="${a.fileData}" target="_blank">${a.fileName}</a>`:'—'}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Sem adiantamentos</td></tr>';

    const {
      totalBruto,
      totalPct,
      totalAdiant,
      totalLiquido
    } = computeResumo(t);

    const motorista = db.users.find(u => u.id === t.motoristaId);

    document.getElementById('modalContent').innerHTML = `
      <h2>Viagem de ${motorista.name}</h2>
      <div>${t.rota.origem} → ${t.rota.destino} | Início: ${t.dataInicio} | Status: ${t.status}</div>
      <div class="kpi" style="margin:10px 0">
        <div class="box"><b>Total Bruto</b><div>${money(totalBruto)}</div></div>
        <div class="box"><b>Total % Motorista</b><div>${money(totalPct)}</div></div>
        <div class="box"><b>Total Adiant.</b><div>${money(totalAdiant)}</div></div>
        <div class="box"><b>Líquido</b><div>${money(totalLiquido)}</div></div>
      </div>
      <div class="actions">
        <button class="btn primary" onclick="addFrete('${tripId}')">Adicionar Frete</button>
        <button class="btn primary" onclick="addAdiant('${tripId}')">Adicionar Adiantamento</button>
        <button class="btn" onclick="closeTripModal()">Fechar</button>
      </div>

      <h3>Fretes</h3>
      <table class="table"><thead><tr><th>#</th><th>Data</th><th>Trecho</th><th>Bruto</th><th>%</th><th>Ganho</th></tr></thead>
      <tbody>${rowsFretes}</tbody></table>

      <h3>Adiantamentos</h3>
      <table class="table"><thead><tr><th>#</th><th>Data</th><th>Valor</th><th>Obs</th><th>Comprovante</th></tr></thead>
      <tbody>${rowsAd}</tbody></table>
    `;

    tripModal.classList.remove('hidden');
  }

  window.closeTripModal = () => {
    document.getElementById('tripModal').classList.add('hidden');
    document.getElementById('modalContent').innerHTML = '';
    renderTrips();
  }

  window.addFrete = (tripId) => {
    const data = prompt('Data (AAAA-MM-DD):', todayISO());
    if (!data) return;
    const origem = prompt('Origem:');
    const destino = prompt('Destino:');
    const bruto = parseFloat(prompt('Valor bruto (R$):', '0').replace(',', '.'));
    const pct = parseFloat(prompt('Porcentagem do motorista (%):', '25').replace(',', '.'));
    if (!origem || !destino || isNaN(bruto) || isNaN(pct)) {
      alert('Dados inválidos.');
      return;
    }

    const db = loadDB();
    const t = db.trips.find(x => x.id === tripId);
    if (!t) return;
    t.fretes.push({
      id: uid(),
      data: data,
      origem: origem,
      destino: destino,
      bruto: Number(bruto),
      pct: Number(pct)
    });
    saveDB(db);
    openTripModal(tripId);
  }

  window.addAdiant = async (tripId) => {
    const data = prompt('Data (AAAA-MM-DD):', todayISO());
    const valor = parseFloat(prompt('Valor adiantado (R$):', '0').replace(',', '.'));
    const obs = prompt('Observação (opcional):', '');
    if (isNaN(valor)) {
      alert('Valor inválido.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.png,.jpg,.jpeg,.pdf,image/*,application/pdf';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async () => {
      const f = input.files[0];
      let fileData = null,
        fileName = null;
      if (f) {
        fileName = f.name;
        fileData = await fileToDataURL(f);
      }

      const db = loadDB();
      const t = db.trips.find(x => x.id === tripId);
      if (!t) return;
      t.adiantamentos.push({
        id: uid(),
        data: data,
        valor: Number(valor),
        obs: obs,
        fileName: fileName,
        fileData: fileData
      });
      saveDB(db);
      openTripModal(tripId);
    };
    input.click();
    document.body.removeChild(input);
  }
});
