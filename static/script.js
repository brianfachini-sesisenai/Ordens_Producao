// --- BASE & TOASTS ---
let ordensGlobais = [];

function mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = mensagem;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- MODO ESCURO (THEME) ---
function alternarTema() {
    const isDark = document.getElementById('toggle-dark').checked;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    Chart.defaults.color = isDark ? '#94a3b8' : '#6b7280';
    if(graficoProducao) graficoProducao.update();
}

function aplicarTemaSalvo() {
    const temaSalvo = localStorage.getItem('theme');
    if(temaSalvo === 'dark') {
        document.getElementById('toggle-dark').checked = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        Chart.defaults.color = '#94a3b8';
    }
}

// --- NAVEGAÇÃO, LOGIN & CONFIGURAÇÕES ---
function fazerLogin(event) {
    event.preventDefault();
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'flex';
    aplicarTemaSalvo(); carregarPerfil(); carregarOrdens(); renderizarEstoque();
    mostrarToast("Login efetuado com sucesso!");
}

function fazerLogout() { document.getElementById('app-view').style.display = 'none'; document.getElementById('login-view').style.display = 'flex'; }

function navegar(pagina) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    document.getElementById(`page-${pagina}`).classList.add('active');
    document.getElementById(`nav-${pagina}`).classList.add('active');
}

function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

function carregarPerfil() {
    const nome = localStorage.getItem('userName') || 'Administrador';
    const cargo = localStorage.getItem('userRole') || 'Gerente de Produção';
    document.getElementById('display-user-name').innerText = nome;
    document.getElementById('display-user-role').innerText = cargo;
    document.getElementById('config-nome').value = nome;
    document.getElementById('config-cargo').value = cargo;
}

function salvarConfiguracoes(event) {
    event.preventDefault();
    localStorage.setItem('userName', document.getElementById('config-nome').value);
    localStorage.setItem('userRole', document.getElementById('config-cargo').value);
    carregarPerfil(); mostrarToast("Perfil atualizado!");
}

// --- GRÁFICOS (CHART.JS) ---
let graficoProducao = null;
function atualizarGrafico(pendentes, andamento, concluidas) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    if (graficoProducao) graficoProducao.destroy();
    graficoProducao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pendentes', 'Em Andamento', 'Concluídas'],
            datasets: [{
                label: 'Peças', data: [pendentes, andamento, concluidas],
                backgroundColor: ['#fef3c7', '#e0f2fe', '#dcfce3'],
                borderColor: ['#d97706', '#0284c7', '#16a34a'],
                borderWidth: 1, borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// --- INTEGRAÇÃO PYTHON (ORDENS) ---
const API_URL = '/ordens';

async function carregarOrdens() {
    try {
        const response = await fetch(API_URL);
        if(!response.ok) return;
        ordensGlobais = await response.json();
        
        // Dashboard Cálculos
        const pConcluidas = ordensGlobais.filter(o => o.status === 'Concluida').reduce((s, o) => s + o.quantidade, 0);
        const pAndamento = ordensGlobais.filter(o => o.status === 'Em andamento').reduce((s, o) => s + o.quantidade, 0);
        const pPendentes = ordensGlobais.filter(o => o.status === 'Pendente').reduce((s, o) => s + o.quantidade, 0);
        const qtdPendentes = ordensGlobais.filter(o => o.status === 'Pendente').length;
        
        // Taxa de Conclusão e Barra
        const taxa = ordensGlobais.length > 0 ? Math.round((ordensGlobais.filter(o => o.status === 'Concluida').length / ordensGlobais.length) * 100) : 0;

        document.getElementById('txt-taxa').innerText = taxa + '%';
        document.getElementById('bar-taxa').style.width = taxa + '%';
        document.getElementById('dash-pecas-concluidas').innerText = pConcluidas + ' un'; 
        
        document.getElementById('dash-pecas-andamento').innerText = pAndamento + ' un';
        document.getElementById('dash-ordens-pendentes').innerText = qtdPendentes;

        atualizarGrafico(pPendentes, pAndamento, pConcluidas);
        filtrarOrdens(); 
    } catch (e) { mostrarToast("Erro ao conectar com API.", "error"); }
}

function filtrarOrdens() {
    const termo = document.getElementById('busca-ordens').value.toLowerCase();
    const filtradas = ordensGlobais.filter(o => o.produto.toLowerCase().includes(termo) || o.id.toString().includes(termo));
    
    const tbody = document.getElementById('tabela-ordens');
    tbody.innerHTML = '';
    filtradas.forEach(ordem => {
        let statusClass = ordem.status === 'Em andamento' ? 'andamento' : (ordem.status === 'Concluida' ? 'concluida' : 'pendente');
        tbody.innerHTML += `
            <tr>
                <td><strong>#OP-${ordem.id}</strong></td><td>${ordem.produto}</td><td>${ordem.quantidade} un</td>
                <td>${ordem.criado_em.split(' ')[0]}</td><td><span class="status ${statusClass}">${ordem.status}</span></td>
                <td>
                    <button class="action-link" onclick="avancarStatus(${ordem.id}, '${ordem.status}')">Avançar</button>
                    <button class="action-link delete" onclick="excluirOrdem(${ordem.id})">Excluir</button>
                </td>
            </tr>`;
    });
}

function exportarCSV() {
    if(ordensGlobais.length === 0) { mostrarToast("Não há ordens para exportar.", "error"); return; }
    let csv = "ID,Produto,Quantidade,Data de Criacao,Status\n";
    ordensGlobais.forEach(o => { csv += `OP-${o.id},${o.produto},${o.quantidade},${o.criado_em},${o.status}\n`; });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "relatorio_ordens.csv";
    link.click();
    mostrarToast("Relatório baixado com sucesso!");
}

async function criarOrdem(event) {
    event.preventDefault();
    const dados = { produto: document.getElementById('produto').value, quantidade: parseInt(document.getElementById('quantidade').value), status: document.getElementById('status').value };
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    fecharModal('modal-nova-ordem'); document.getElementById('form-ordem').reset(); mostrarToast("Ordem gerada!"); carregarOrdens(); 
}

async function avancarStatus(id, statusAtual) {
    let novoStatus = statusAtual === 'Pendente' ? 'Em andamento' : (statusAtual === 'Em andamento' ? 'Concluida' : 'Pendente');
    await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus }) });
    mostrarToast("Status alterado!"); carregarOrdens();
}

async function excluirOrdem(id) {
    if (confirm('Apagar esta ordem permanentemente?')) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        mostrarToast("Ordem excluída."); carregarOrdens();
    }
}

// --- ESTOQUE MOCKADO ---
let estoque = [ { id: 1, nome: "Parafuso Sextavado M8", qtd: 5000 }, { id: 2, nome: "Fio de Cobre 2mm (Rolo)", qtd: 15 }, { id: 3, nome: "Chapa de Aço Inox", qtd: 120 } ];

function renderizarEstoque() {
    const termo = document.getElementById('busca-estoque').value.toLowerCase();
    const tbody = document.getElementById('tabela-estoque');
    tbody.innerHTML = ''; let itensAlerta = 0;

    const filtrados = estoque.filter(i => i.nome.toLowerCase().includes(termo));
    filtrados.forEach(item => {
        let status = 'Estável'; let statusClass = 'concluida';
        if (item.qtd <= 50) { status = 'Critico'; statusClass = 'alerta'; itensAlerta++; }
        else if (item.qtd > 1000) { status = 'Alto'; statusClass = 'andamento'; }

        tbody.innerHTML += `
            <tr>
                <td><strong>MAT-${item.id}</strong></td><td>${item.nome}</td><td>${item.qtd}</td>
                <td><span class="status ${statusClass}">${status}</span></td>
                <td><button class="action-link delete" onclick="excluirMaterial(${item.id})">Remover</button></td>
            </tr>`;
    });
    document.getElementById('est-total').innerText = estoque.length;
    document.getElementById('est-alerta').innerText = estoque.filter(i => i.qtd <= 50).length;
}

function criarMaterial(event) {
    event.preventDefault();
    const novoId = estoque.length > 0 ? Math.max(...estoque.map(e=>e.id)) + 1 : 1;
    estoque.push({ id: novoId, nome: document.getElementById('est-nome').value, qtd: parseInt(document.getElementById('est-qtd').value) });
    fecharModal('modal-novo-material'); document.getElementById('form-estoque').reset(); mostrarToast("Material cadastrado!"); renderizarEstoque();
}
function excluirMaterial(id) { estoque = estoque.filter(i => i.id !== id); renderizarEstoque(); }

// --- FUNDO 3D INTERATIVO (THREE.JS) ---
function iniciarFundo3D() {
    const canvas = document.getElementById('bg-canvas');
    if(!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = 40;

    const geometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 120;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Função que gera a ilusão de "relevo/crateras" através de luz e sombra
    function criarTexturaRelevo() {
        const canvasTextura = document.createElement('canvas');
        canvasTextura.width = 128; canvasTextura.height = 128;
        const ctx = canvasTextura.getContext('2d');
        
        // 1. Desenha a base da bolinha
        const baseGradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 60);
        baseGradient.addColorStop(0, 'rgba(59, 130, 246, 1)'); 
        baseGradient.addColorStop(0.8, 'rgba(30, 64, 175, 0.8)'); 
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); 
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, 0, 128, 128);

        // 2. Adiciona as "irregularidades" (simulação de relevo)
        ctx.globalCompositeOperation = 'overlay';
        
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 45; 
            const x = 64 + Math.cos(angle) * radius;
            const y = 64 + Math.sin(angle) * radius;
            const r = 2 + Math.random() * 6; 

            // Sombra 
            ctx.beginPath();
            ctx.arc(x - 2, y - 2, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill();

            // Luz 
            ctx.beginPath();
            ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        }
        
        ctx.globalCompositeOperation = 'source-over'; 
        
        const texture = new THREE.Texture(canvasTextura);
        texture.needsUpdate = true;
        return texture;
    }

    // Material refinado: tamanho equilibrado, textura com relevo
    const material = new THREE.PointsMaterial({
        size: 1.8, 
        map: criarTexturaRelevo(),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        color: 0xffffff
    });

    const particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
        mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        if(document.getElementById('login-view').style.display !== 'none') {
            const elapsedTime = clock.getElapsedTime();
            
            particlesMesh.rotation.y = elapsedTime * 0.05;
            particlesMesh.rotation.x += (mouseY - particlesMesh.rotation.x) * 0.05;
            particlesMesh.rotation.y += (mouseX - particlesMesh.rotation.y) * 0.05;

            renderer.render(scene, camera);
        }
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Inicia o motor 3D
setTimeout(iniciarFundo3D, 100);