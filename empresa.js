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
    alert('Viagem criada. Você pode gerenciá-la na página de Gerenciamento de Viagens.');
  };

  function clearTripForm() {
    ['tripDriverCpf', 'tripPlaca', 'tripModelo', 'tripCarga', 'tripOrigem', 'tripDestino', 'tripObs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('tripInicio').value = '';
    document.getElementById('tripCarga').value = '';
  }
});
