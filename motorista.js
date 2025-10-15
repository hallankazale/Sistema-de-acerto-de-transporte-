// Motorista page logic
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

  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
  const authCard = document.getElementById('authCard');
  const dash = document.getElementById('dash');

  btnLogin.onclick = () => {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const db = loadDB();
    const user = db.users.find(u => u.email === email && u.password === password && u.role === 'motorista');
    if (!user) return alert('Credenciais inválidas para Motorista.');
    setSession(user);
    showDash();
  };

  btnRegister.onclick = () => {
    const name = document.getElementById('regName').value.trim();
    const cpf = document.getElementById('regCpf').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    if (!name || !cpf || !email || !password) return alert('Preencha todos os campos.');
    const db = loadDB();
    if (db.users.some(u => u.email === email)) return alert('Já existe usuário com este email.');
    if (db.users.some(u => u.cpf === cpf)) return alert('Já existe usuário com este CPF.');
    const user = {
      id: uid(),
      name,
      cpf,
      email,
      password,
      role: 'motorista'
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
  if (me && me.role === 'motorista') {
    showDash();
  }

  function showDash() {
    authCard.style.display = 'none';
    dash.style.display = 'block';
    const me = getSession();
    if (!me) return;
    document.getElementById('meName').innerHTML = `Olá, <strong>${me.name}</strong>!`;
    document.getElementById('simData').value = todayISO();
    renderTrips();
    renderSim();
  }

  function renderTrips() {
    const db = loadDB();
    const me = getSession();
    if (!me) return;
    const list = document.getElementById('listTrips');
    list.innerHTML = '';
    const trips = db.trips.filter(t => t.motoristaId === me.id);
    if (trips.length === 0) {
      list.innerHTML = '<p class="small">Nenhuma viagem cadastrada pela empresa.</p>';
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
      const fretes = t.fretes.map((f, i) => `<div class="small">#${i+1} ${f.data} — ${f.origem}→${f.destino} | Bruto ${money(f.bruto)} | % ${pct(f.pct)} | Ganho ${money(f.bruto*(f.pct/100))}</div>`).join('');
      const ad = t.adiantamentos.map((a, i) => `<div class="small">Adiant. ${i+1} — ${a.data||''} | ${money(a.valor)} ${a.fileName?`| <a class="linkable" href="${a.fileData}" target="_blank">${a.fileName}</a>`:''}</div>`).join('') || '<div class="small">Sem adiantamentos.</div>';
      item.innerHTML = `
        <div>
          <div><strong>${t.truck.placa}</strong> • ${t.truck.modelo||'-'} • <span class="badge">${t.status}</span></div>
          <div class="small">${t.rota.origem} → ${t.rota.destino} • Início: ${t.dataInicio}</div>
          <div style="margin-top:6px">${fretes||'<div class="small">Sem fretes.</div>'}</div>
          <div style="margin-top:6px"><b>Adiantamentos:</b> ${ad}</div>
        </div>
        <div>
          <div class="small">Bruto: ${money(totalBruto)} | % Mot.: ${money(totalPct)} | Adiant.: ${money(totalAdiant)}</div>
          <div><strong>Líquido: ${money(totalLiquido)}</strong></div>
        </div>
      `;
      list.appendChild(item);
    });
  }

  // Tabs in motorista dashboard
  document.getElementById('tabsMain').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('#tabsMain .tab').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.tab;
    if (key === 'minhas') {
      document.getElementById('tab-minhas').classList.remove('hidden');
      document.getElementById('tab-simulador').classList.add('hidden');
    } else {
      document.getElementById('tab-simulador').classList.remove('hidden');
      document.getElementById('tab-minhas').classList.add('hidden');
    }
  });

  // Simulator
  let simRows = JSON.parse(localStorage.getItem('sim_rows') || '[]');

  function persistSim() {
    localStorage.setItem('sim_rows', JSON.stringify(simRows));
  }

  document.getElementById('btnAddSim').onclick = () => {
    const data = document.getElementById('simData').value || todayISO();
    const bruto = Number((document.getElementById('simBruto').value || '0').replace(',', '.'));
    const pctVal = Number((document.getElementById('simPct').value || '0').replace(',', '.'));
    const adiant = Number((document.getElementById('simAdiant').value || '0').replace(',', '.'));
    const obs = document.getElementById('simObs').value.trim();
    if (isNaN(bruto) || isNaN(pctVal) || isNaN(adiant)) return alert('Valores inválidos.');
    simRows.push({
      id: uid(),
      data,
      bruto,
      pct: pctVal,
      adiant,
      obs
    });
    persistSim();
    renderSim();
    document.getElementById('simBruto').value = '';
    document.getElementById('simPct').value = '';
    document.getElementById('simAdiant').value = '';
    document.getElementById('simObs').value = '';
  };

  function renderSim() {
    const list = document.getElementById('listSim');
    list.innerHTML = '';
    let totalBruto = 0,
      totalPct = 0,
      totalAdiant = 0;
    simRows.sort((a, b) => a.data.localeCompare(b.data)).forEach((r, i) => {
      const ganho = r.bruto * (r.pct / 100);
      totalBruto += r.bruto;
      totalPct += ganho;
      totalAdiant += r.adiant;
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div>
          <div><strong>${i+1}.</strong> ${r.data} — Bruto ${money(r.bruto)} | % ${pct(r.pct)} | Ganho ${money(ganho)} | Adiant. ${money(r.adiant)}</div>
          <div class="small">${r.obs||''}</div>
        </div>
        <div><button class="btn" data-del="${r.id}">Excluir</button></div>
      `;
      list.appendChild(item);
    });
    list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      simRows = simRows.filter(x => x.id !== b.dataset.del);
      persistSim();
      renderSim();
    });
    document.getElementById('simTotalBruto').textContent = money(totalBruto);
    document.getElementById('simTotalPct').textContent = money(totalPct);
    document.getElementById('simTotalAdiant').textContent = money(totalAdiant);
    document.getElementById('simTotalLiq').innerHTML = `<strong>${money(totalPct-totalAdiant)}</strong>`;
  }
});
