document.addEventListener('DOMContentLoaded', () => {
    ensureRoleOrRedirect('empresa', 'empresa.html');

    const tripModal = document.getElementById('tripModal');
    
    document.getElementById('btnLogout').onclick = ()=>{ clearSession(); window.location.href = 'index.html'; };

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
            <button class="btn primary" onclick="addFrete('${t.id}')">Adicionar Frete</button>
            <button class="btn primary" onclick="window.location.href='adiantamento.html?tripId=${t.id}'">Adicionar Adiantamento</button>
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
    
    window.closeTripModal = () => {
        document.getElementById('tripModal').classList.add('hidden');
        document.getElementById('modalContent').innerHTML = '';
        renderTrips();
    }
    
    renderTrips();
});
