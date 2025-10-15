// Empresa page logic
document.addEventListener('DOMContentLoaded', () => {
  // Tabs for auth
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const key = t.dataset.tab;
      if(key==='login'){ document.getElementById('tab-login').classList.remove('hidden'); document.getElementById('tab-register').classList.add('hidden'); }
      else{ document.getElementById('tab-register').classList.remove('hidden'); document.getElementById('tab-login').classList.add('hidden'); }
    });
  });

  // Buttons
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
  const authCard = document.getElementById('authCard');
  const dash = document.getElementById('dash');

  btnLogin.onclick = () => {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const db = loadDB();
    const user = db.users.find(u=>u.email===email && u.password===password && u.role==='empresa');
    if(!user) return alert('Credenciais inválidas para Empresa.');
    setSession(user);
    showDash();
  };

  btnRegister.onclick = () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    if(!name||!email||!password) return alert('Preencha nome, email e senha.');
    const db = loadDB();
    if(db.users.some(u=>u.email===email)) return alert('Já existe usuário com este email.');
    const user = { id:uid(), name, email, password, role:'empresa' };
    db.users.push(user); saveDB(db);
    alert('Conta criada. Faça login.');
    document.querySelector('.tab[data-tab="login"]').click();
    document.getElementById('loginEmail').value = email;
  };

  btnLogout.onclick = ()=>{ clearSession(); dash.style.display='none'; authCard.style.display='block'; };

  const me = getSession();
  if(me && me.role==='empresa'){ showDash(); }

  function showDash(){
    authCard.style.display='none'; dash.style.display='block';
    const me = getSession(); if(!me) return;
    document.getElementById('meName').innerHTML = `<strong>${me.name}</strong> (${me.email})`;
    renderTrips();
  }
  
  // Create trip
  document.getElementById('btnCreateTrip').onclick = ()=>{
    const me = getSession(); if(!me) return;
    const driverEmail = document.getElementById('tripDriverEmail').value.trim().toLowerCase();
    const placa = document.getElementById('tripPlaca').value.trim();
    const modelo = document.getElementById('tripModelo').value.trim();
    const carga = document.getElementById('tripCarga').value.trim();
    const origem = document.getElementById('tripOrigem').value.trim();
    const destino = document.getElementById('tripDestino').value.trim();
    const dataInicio = document.getElementById('tripInicio').value || todayISO();
    const obs = document.getElementById('tripObs').value.trim();

    if(!driverEmail || !placa || !origem || !destino){
      return alert('Preencha motorista (email), placa, origem e destino.');
    }

    const db = loadDB();
    const motorista = db.users.find(u=>u.email===driverEmail && u.role==='motorista');
    if(!motorista){ return alert('Motorista não encontrado com esse email.'); }

    const trip = {
      id: uid(),
      empresaId: me.id,
      motoristaId: motorista.id,
      truck: { placa, modelo, carga },
      rota: { origem, destino },
      dataInicio,
      obs,
      status: 'aberta',
      fretes: [],
      adiantamentos: []
    };
    db.trips.unshift(trip); saveDB(db);
    clearTripForm();
    renderTrips();
    alert('Viagem criada.');
  };

  function clearTripForm(){
    ['tripDriverEmail','tripPlaca','tripModelo','tripCarga','tripOrigem','tripDestino','tripObs'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('tripInicio').value='';
  }
  
  // Filter trips
  document.getElementById('btnFilterTrips').onclick = ()=>{
    const filterEmail = document.getElementById('filterDriverEmail').value.trim().toLowerCase();
    renderTrips(filterEmail);
  };

  function renderTrips(filterEmail = null){
    const db = loadDB();
    const me = getSession(); if(!me) return;
    const list = document.getElementById('listTrips'); list.innerHTML='';

    let trips = db.trips.filter(t=>t.empresaId===me.id);
    if(filterEmail){
      const motorista = db.users.find(u => u.email === filterEmail && u.role === 'motorista');
      if(motorista){
        trips = trips.filter(t => t.motoristaId === motorista.id);
      } else {
        trips = [];
        alert('Nenhum motorista ou viagem encontrado com este email.');
      }
    }
    
    let totalFretes=0;
    trips.forEach(t=> totalFretes += t.fretes.length);
    document.getElementById('kpiTrips').innerHTML = `<strong>${trips.length}</strong>`;
    document.getElementById('kpiFretes').innerHTML = `<strong>${totalFretes}</strong>`;

    if(trips.length===0){ list.innerHTML = '<p class="small">Nenhuma viagem.</p>'; return; }
    trips.forEach(t=>{
      const { totalBruto, totalPct, totalAdiant, totalLiquido } = computeResumo(t);
      const item = document.createElement('div'); item.className='item';
      item.innerHTML = `
        <div>
          <div><strong>${t.truck.placa}</strong> • ${t.truck.modelo||'-'} • <span class="badge">${t.status}</span></div>
          <div class="small">${t.rota.origem} → ${t.rota.destino} • Início: ${t.dataInicio} • Fretes: ${t.fretes.length}</div>
        </div>
        <div>
          <div class="small">Bruto: ${money(totalBruto)} | % Mot.: ${money(totalPct)} | Adiant.: ${money(totalAdiant)}</div>
          <div><strong>Líquido: ${money(totalLiquido)}</strong></div>
          <div style="margin-top:6px;display:flex;gap:6px">
            <button class="btn" data-open="${t.id}">Abrir</button>
          </div>
        </div>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('[data-open]').forEach(b=> b.onclick = ()=> openTripModal(b.dataset.open));
  }

  // Trip modal-like panel (create simple drawer with prompt-based interactions for brevity)
  function openTripModal(tripId){
    const db = loadDB();
    const t = db.trips.find(x=>x.id===tripId);
    if(!t) return;

    // Build lightweight panel in new window for manage fretes & adiantamentos
    const w = window.open('', '_blank');
    const rowsFretes = t.fretes.map((f,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${f.data}</td>
        <td>${f.origem} → ${f.destino}</td>
        <td>${money(f.bruto)}</td>
        <td>${pct(f.pct)}</td>
        <td>${money(f.bruto*(f.pct/100))}</td>
      </tr>`).join('') || '<tr><td colspan="6">Sem fretes</td></tr>';

    const rowsAd = t.adiantamentos.map((a,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${a.data||''}</td>
        <td>${money(a.valor)}</td>
        <td>${a.obs||''}</td>
        <td>${a.fileName?`<a class="linkable" href="${a.fileData}" target="_blank">${a.fileName}</a>`:'—'}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Sem adiantamentos</td></tr>';

    const { totalBruto, totalPct, totalAdiant, totalLiquido } = computeResumo(t);

    w.document.write(`<!doctype html><html lang="pt-BR"><head>
      <meta charset="utf-8"><title>Viagem ${t.truck.placa}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:20px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f5f5f5}
        .kpi{display:flex;gap:12px}
        .box{border:1px solid #ddd;padding:8px;border-radius:8px;background:#fafafa}
        .actions{margin:10px 0;display:flex;gap:8px}
      </style>
    </head><body>
      <h2>Viagem — ${t.truck.placa} (${t.truck.modelo||'-'})</h2>
      <div>${t.rota.origem} → ${t.rota.destino} | Início: ${t.dataInicio} | Status: ${t.status}</div>
      <div class="kpi" style="margin:10px 0">
        <div class="box"><b>Total Bruto</b><div>${money(totalBruto)}</div></div>
        <div class="box"><b>Total % Motorista</b><div>${money(totalPct)}</div></div>
        <div class="box"><b>Total Adiant.</b><div>${money(totalAdiant)}</div></div>
        <div class="box"><b>Líquido</b><div>${money(totalLiquido)}</div></div>
      </div>
      <div class="actions">
        <button onclick="window.addFrete()">Adicionar Frete</button>
        <button onclick="window.addAdiant()">Adicionar Adiantamento</button>
        <button onclick="window.close()">Fechar</button>
      </div>

      <h3>Fretes</h3>
      <table><thead><tr><th>#</th><th>Data</th><th>Trecho</th><th>Bruto</th><th>%</th><th>Ganho</th></tr></thead>
      <tbody id="tbFretes">${rowsFretes}</tbody></table>

      <h3>Adiantamentos</h3>
      <table><thead><tr><th>#</th><th>Data</th><th>Valor</th><th>Obs</th><th>Comprovante</th></tr></thead>
      <tbody id="tbAd">${rowsAd}</tbody></table>

      <script>
        const tripId = ${JSON.stringify(tripId)};

        window.addFrete = async function(){
          const data = prompt('Data (AAAA-MM-DD):','${todayISO()}');
          if(!data) return;
          const origem = prompt('Origem:');
          const destino = prompt('Destino:');
          const bruto = parseFloat(prompt('Valor bruto (R$):','0').replace(',','.'));
          const pct = parseFloat(prompt('Porcentagem do motorista (%):','25').replace(',','.'));
          if(!origem||!destino||isNaN(bruto)||isNaN(pct)){ alert('Dados inválidos.'); return; }
          window.opener.postMessage({ type:'EMPRESA_ADD_FRETE', tripId, data, origem, destino, bruto, pct }, '*');
        }

        window.addAdiant = async function(){
          const data = prompt('Data (AAAA-MM-DD):','${todayISO()}');
          const valor = parseFloat(prompt('Valor adiantado (R$):','0').replace(',','.'));
          const obs = prompt('Observação (opcional):','');
          if(isNaN(valor)){ alert('Valor inválido.'); return; }
          // file picker
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.png,.jpg,.jpeg,.pdf,image/*,application/pdf';
          input.onchange = async () => {
            const f = input.files[0];
            let fileData = null, fileName = null;
            if(f){
              fileName = f.name;
              const reader = new FileReader();
              reader.onload = ()=>{
                fileData = reader.result;
                window.opener.postMessage({ type:'EMPRESA_ADD_ADIANT', tripId, data, valor, obs, fileName, fileData }, '*');
              };
              reader.readAsDataURL(f);
            } else {
              window.opener.postMessage({ type:'EMPRESA_ADD_ADIANT', tripId, data, valor, obs }, '*');
            }
          };
          input.click();
        }

        window.onmessage = (ev)=>{
          if(ev.data && ev.data.type==='REFRESH_TRIP'){
            // simple reload to show updates
            location.reload();
          }
        };
        
        function todayISO(){ return new Date().toISOString().slice(0,10); }
      </script>
    </body></html>`);
    w.document.close();
  }

  // receive postMessage from modal window
  window.addEventListener('message', (ev)=>{
    const msg = ev.data||{};
    if(msg.type==='EMPRESA_ADD_FRETE'){
      const db = loadDB();
      const t = db.trips.find(x=>x.id===msg.tripId);
      if(!t) return;
      t.fretes.push({ id:uid(), data: msg.data||todayISO(), origem: msg.origem||'', destino: msg.destino||'', bruto: Number(msg.bruto||0), pct: Number(msg.pct||0) });
      saveDB(db);
      renderTrips();
      ev.source.postMessage({type:'REFRESH_TRIP'}, '*');
    }
    if(msg.type==='EMPRESA_ADD_ADIANT'){
      const db = loadDB();
      const t = db.trips.find(x=>x.id===msg.tripId);
      if(!t) return;
      t.adiantamentos.push({ id:uid(), data: msg.data||todayISO(), valor: Number(msg.valor||0), obs: msg.obs||'', fileName: msg.fileName||null, fileData: msg.fileData||null });
      saveDB(db);
      renderTrips();
      ev.source.postMessage({type:'REFRESH_TRIP'}, '*');
    }
  });
});
