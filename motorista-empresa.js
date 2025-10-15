document.addEventListener('DOMContentLoaded', () => {
  ensureRoleOrRedirect('empresa', 'empresa.html');

  const urlParams = new URLSearchParams(window.location.search);
  const motoristaId = urlParams.get('id');
  if (!motoristaId) {
    document.getElementById('profileCard').innerHTML = '<p class="small">Motorista não especificado.</p>';
    document.getElementById('tripsCard').classList.add('hidden');
    return;
  }

  let db = loadDB();
  let motorista = db.users.find(u => u.id === motoristaId && u.role === 'motorista');
  if (!motorista) {
    document.getElementById('profileCard').innerHTML = '<p class="small">Motorista não encontrado.</p>';
    document.getElementById('tripsCard').classList.add('hidden');
    return;
  }

  // Render profile info
  function renderProfile() {
    document.getElementById('profileName').textContent = motorista.name;
    document.getElementById('profileEmail').textContent = motorista.email;
    document.getElementById('profileCpf').textContent = motorista.cpf;
  }
  renderProfile();

  // Handle tabs
  document.getElementById('tabsTrips').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('#tabsTrips .tab').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const tabKey = btn.dataset.tab;
    document.getElementById('tab-ativas').classList.add('hidden');
    document.getElementById('tab-finalizadas').classList.add('hidden');
    document.getElementById(`tab-${tabKey}`).classList.remove('hidden');
    renderTrips();
  });

  // Render trips list
  function renderTrips() {
    db = loadDB(); // Re-load to get latest data
    const activeTripsList = document.getElementById('tab-ativas');
    const finishedTripsList = document.getElementById('tab-finalizadas');
    activeTripsList.innerHTML = '';
    finishedTripsList.innerHTML = '';

    const allTrips = db.trips.filter(t => t.motoristaId === motoristaId);

    const activeTrips = allTrips.filter(t => t.status === 'aberta');
    if (activeTrips.length === 0) activeTripsList.innerHTML = '<p class="small">Nenhuma viagem ativa.</p>';
    activeTrips.forEach(t => renderTripItem(t, activeTripsList));

    const finishedTrips = allTrips.filter(t => t.status !== 'aberta');
    if (finishedTrips.length === 0) finishedTripsList.innerHTML = '<p class="small">Nenhuma viagem finalizada.</p>';
    finishedTrips.forEach(t => renderTripItem(t, finishedTripsList));
  }
  renderTrips();

  function renderTripItem(t, listElement) {
    const { totalBruto, totalPct, totalAdiant, totalLiquido } = computeResumo(t);
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div>
        <div><strong>${t.truck.placa}</strong> • ${t.truck.modelo||'-'} • <span class="badge">${t.status}</span></div>
        <div class="small">${t.rota.origem} → ${t.rota.destino} • Início: ${t.dataInicio} • Fretes: ${t.fretes.length}</div>
      </div>
      <div>
        <div class="small">Bruto: ${money(totalBruto)} | % Mot.: ${money(totalPct)} | Adiant.: ${money(totalAdiant)}</div>
        <div><strong>Líquido: ${money(totalLiquido)}</strong></div>
        <div style="margin-top:6px;display:flex;gap:6px">
          <button class="btn" data-open-modal="${t.id}">Abrir</button>
        </div>
      </div>
    `;
    listElement.appendChild(item);
  }

  // Handle edit profile modal
  const editModal = document.getElementById('editModal');
  document.getElementById('btnEditProfile').onclick = () => {
    document.getElementById('editName').value = motorista.name;
    document.getElementById('editEmail').value = motorista.email;
    document.getElementById('editCpf').value = motorista.cpf;
    editModal.classList.remove('hidden');
  };

  document.getElementById('btnSaveEdit').onclick = () => {
    const newName = document.getElementById('editName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim().toLowerCase();
    const newCpf = document.getElementById('editCpf').value.trim();

    if (!newName || !newEmail || !newCpf) return alert('Todos os campos são obrigatórios.');

    db = loadDB();
    const otherUsers = db.users.filter(u => u.id !== motoristaId);
    if (otherUsers.some(u => u.email === newEmail)) return alert('Este email já está em uso.');
    if (otherUsers.some(u => u.cpf === newCpf)) return alert('Este CPF já está em uso.');

    motorista.name = newName;
    motorista.email = newEmail;
    motorista.cpf = newCpf;

    saveDB(db);
    renderProfile();
    editModal.classList.add('hidden');
    alert('Perfil atualizado com sucesso!');
  };
});
