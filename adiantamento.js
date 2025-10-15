document.addEventListener('DOMContentLoaded', () => {
    ensureRoleOrRedirect('empresa', 'empresa.html');

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    if (!tripId) {
        document.getElementById('adiantamentoForm').innerHTML = '<p class="small">Viagem não especificada.</p>';
        return;
    }

    document.getElementById('adData').value = todayISO();
    
    document.getElementById('btnSaveAdiantamento').onclick = async () => {
        const data = document.getElementById('adData').value;
        const valor = Number(document.getElementById('adValor').value);
        const obs = document.getElementById('adObs').value.trim();
        const file = document.getElementById('adComprovante').files[0];

        if (!data || isNaN(valor) || valor <= 0) {
            alert('Preencha a data e um valor de adiantamento válido.');
            return;
        }

        let fileData = null;
        let fileName = null;
        if (file) {
            fileName = file.name;
            fileData = await fileToDataURL(file);
        }
        
        const db = loadDB();
        const t = db.trips.find(x => x.id === tripId);
        if (!t) {
            alert('Viagem não encontrada.');
            return;
        }

        t.adiantamentos.push({
            id: uid(),
            data: data,
            valor: valor,
            obs: obs,
            fileName: fileName,
            fileData: fileData
        });
        saveDB(db);
        alert('Adiantamento salvo com sucesso!');
        window.location.href = 'gerenciar.html';
    };

    document.getElementById('btnLogout').onclick = ()=>{ clearSession(); window.location.href = 'index.html'; };
});
