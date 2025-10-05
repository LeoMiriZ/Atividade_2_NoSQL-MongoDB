document.addEventListener('DOMContentLoaded', () => {
    const realitySelector = document.getElementById('realitySelector');
    const votingArea = document.getElementById('voting-area');
    const participantsList = document.getElementById('participantsList');
    const voteMessage = document.getElementById('voteMessage');
    const chartArea = document.getElementById('chart-area');
    const resultsArea = document.getElementById('results-area');
    
    let allRealityShows = [];
    let voteChart;

    const init = async () => {
        setupEventListeners();
        try {
            const response = await fetch('/api/premios');
            if (!response.ok) throw new Error('Falha ao carregar os reality shows.');
            allRealityShows = await response.json();
            
            const selectForAge = document.getElementById('selectRealityForAge');

            allRealityShows.forEach(reality => {
                const option = document.createElement('option');
                option.value = reality.nome;
                option.textContent = reality.nome;
                
                realitySelector.appendChild(option);
                selectForAge.appendChild(option.cloneNode(true));
            });

        } catch (error) {
            resultsArea.textContent = `Erro na inicialização: ${error.message}`;
        }
    };

    const renderParticipantsForVoting = (realityName) => {
        const reality = allRealityShows.find(r => r.nome === realityName);
        participantsList.innerHTML = '';
        if (!reality || !reality.participantes) return;

        reality.participantes.forEach(p => {
            const participantItem = document.createElement('div');
            participantItem.className = 'participant-item';
            participantItem.innerHTML = `
                <h4>${p.nome}</h4>
                <span>Idade: ${p.idade}</span>
                <button class="vote-button" data-reality="${realityName}" data-participant="${p.nome}">Votar</button>
            `;
            participantsList.appendChild(participantItem);
        });
        votingArea.style.display = 'block';
    };

    const updateChart = async (realityName) => {
        try {
            const response = await fetch(`/api/votos/${encodeURIComponent(realityName)}`);
            if (!response.ok) throw new Error('Falha ao buscar dados de votos.');
            const participants = await response.json();

            const labels = participants.map(p => p.nome);
            const data = participants.map(p => p.total_votos || 0);

            if (voteChart) voteChart.destroy();

            const ctx = document.getElementById('voteChart').getContext('2d');
            voteChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Votos',
                        data: data,
                        backgroundColor: 'rgba(90, 103, 216, 0.6)',
                        borderColor: 'rgba(90, 103, 216, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                    plugins: { legend: { display: false }, title: { display: true, text: `Votos - ${realityName}` } }
                }
            });
            chartArea.style.display = 'block';
        } catch (error) {
            console.error('Erro ao atualizar gráfico:', error);
            chartArea.style.display = 'none';
        }
    };

    const handleVoteClick = async (event) => {
        if (!event.target.classList.contains('vote-button')) return;
        
        const { reality, participant } = event.target.dataset;
        voteMessage.textContent = `Votando em ${participant}...`;
        voteMessage.style.color = 'var(--primary-color)';

        try {
            const response = await fetch(`/api/votar/${encodeURIComponent(reality)}/${encodeURIComponent(participant)}`, { method: 'PATCH' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            voteMessage.textContent = `Voto em ${participant} computado com sucesso!`;
            voteMessage.style.color = '#28a745';
            updateChart(reality);
        } catch (error) {
            voteMessage.textContent = `Erro: ${error.message}`;
            voteMessage.style.color = '#dc3545';
        }
    };

    const fetchAndDisplayApiData = async (url) => {
        resultsArea.textContent = 'Carregando...';
        try {
            const response = await fetch(url);
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.message || `Erro ${response.status}`);
            resultsArea.textContent = JSON.stringify(responseData, null, 2);
        } catch (error) {
            resultsArea.textContent = `Falha na requisição:\n${error.message}`;
        }
    };
    
    const setupEventListeners = () => {
        realitySelector.addEventListener('change', () => {
            const selectedReality = realitySelector.value;
            voteMessage.textContent = '';
            if (selectedReality) {
                renderParticipantsForVoting(selectedReality);
                updateChart(selectedReality);
            } else {
                votingArea.style.display = 'none';
                chartArea.style.display = 'none';
                if (voteChart) voteChart.destroy();
            }
        });

        participantsList.addEventListener('click', handleVoteClick);
        
        document.querySelectorAll('button[data-endpoint]').forEach(button => {
            button.addEventListener('click', () => fetchAndDisplayApiData(button.dataset.endpoint));
        });

        document.getElementById('btnIdade').addEventListener('click', () => {
            const name = document.getElementById('selectRealityForAge').value;
            if (name) {
                fetchAndDisplayApiData(`/api/idade/${encodeURIComponent(name)}`);
            } else {
                alert('Por favor, selecione um reality show.');
            }
        });

        document.getElementById('btnMaiorPremio').addEventListener('click', () => {
            const value = document.getElementById('inputPremioValor').value;
            if (value) {
                fetchAndDisplayApiData(`/api/maior/${value}`);
            } else {
                alert('Por favor, digite um valor de prêmio.');
            }
        });

        document.getElementById('copy-button').addEventListener('click', () => {
            navigator.clipboard.writeText(resultsArea.textContent).then(() => {
                const btn = document.getElementById('copy-button');
                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => { btn.innerHTML = originalIcon; }, 2000);
            });
        });
    };
    
    init();
});