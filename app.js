// ==================== Formatar input Telefone ========================== //
const telefoneInput = document.getElementById('telefone');
if(telefoneInput) {
    telefoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        v = v.substring(0, 11);
        if (v.length > 10) { v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); } 
        else if (v.length > 6) { v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3'); } 
        else if (v.length > 2) { v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2'); }
        e.target.value = v;
    });
}

// ==================== Enviar Evento e Form ========================== //
function enviarEvento() {
    const selecaoDivida = document.getElementById('valor-divida').value;
    if (selecaoDivida === "Abaixo de R$50 mil") {
        fbq('trackCustom', 'Lead Não Qualificado', { valor: selecaoDivida });
    } else {
        fbq('track', 'Lead Qualificado', {
            content_category: 'Calculadora de Superendividamento',
            status: 'Qualificado'
        });
    }
}

async function enviarForm() {
    const form = document.getElementById('form-superendividamento');
    const formData = new FormData(form);

    function getCookie(name) {
        let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
        return '';
    }

    formData.append('userAgent', navigator.userAgent);
    formData.append('fbp', getCookie('_fbp'));
    formData.append('fbc', getCookie('_fbc')); 

    const url = "SUA_URL_DO_APPS_SCRIPT_AQUI"; // Atualize a URL se necessário

    try {
        await fetch(url, { method: 'POST', body: formData, mode: 'no-cors' });
        console.log("Dados enviados com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar formulário:", error);
    }
}

function processarFormulario(botao) {
    const form = document.getElementById('form-superendividamento');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    enviarEvento();
    enviarForm(); // Descomente caso tenha a URL configurada

    const modalId = botao.getAttribute('data-modal');
    const modal = document.getElementById(modalId);

    if (modal) {
        modal.showModal();
        document.body.classList.add('sem-scroll');
    }
}

// ==================== Fechar POPUP ==================== //
const closeButtons = document.querySelectorAll('.close-modal');
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('dialog');
        if (modal) {
            modal.close();
            document.body.classList.remove('sem-scroll');
        };
    });
});

// ================= Funcionalidades da Calculadora ================= //
function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, "");
    if (valor.length === 0) { input.value = ""; return; }
    valor = (parseFloat(valor) / 100).toFixed(2);
    valor = valor.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = "R$ " + valor;
}

function removerFormatacao(valor) {
    if (!valor || typeof valor !== 'string') return 0;
    const valorNumerico = valor.replace("R$", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(valorNumerico) || 0;
}

// Lógica de Adicionar/Remover Parcelas
function adicionarParcela() {
    const container = document.getElementById("parcelas-container");
    const novaParcela = document.createElement("div");
    novaParcela.className = "parcela";
    novaParcela.innerHTML = `
      <input type="text" placeholder="Valor da Parcela" class="campo-parcela" oninput="formatarMoeda(this)" />
      <select class="tipo-parcela">
        <option value="consignado">Empréstimo Consignado</option>
        <option value="pessoal">Empréstimo Pessoal</option>
        <option value="cheque">Parcela Cheque Especial</option>
        <option value="cartao">Parcela Cartão de Crédito</option>
      </select>
    `;
    container.appendChild(novaParcela);
    
    if (container.querySelectorAll(".parcela").length > 1) {
        document.getElementById("remover-parcela").style.display = "block";
    }
}

function removerParcela() {
    const container = document.getElementById("parcelas-container");
    const parcelas = container.querySelectorAll(".parcela");
    if (parcelas.length > 1) {
        container.removeChild(parcelas[parcelas.length - 1]);
    }
    if (container.querySelectorAll(".parcela").length === 1) {
        document.getElementById("remover-parcela").style.display = "none";
    }
}

// Lógica de Cálculo
let grafico;

function calcularResultados() {
    const erroContainer = document.getElementById("mensagem-erro");
    erroContainer.innerText = "";
    
    let totalDividas = 0;
    const parcelas = document.querySelectorAll(".parcela");
    parcelas.forEach(p => {
        const valor = removerFormatacao(p.querySelector("input").value);
        if (!isNaN(valor)) totalDividas += valor;
    });

    const rendaBrutaInput = document.getElementById("renda-bruta");
    const rendaLiquidaInput = document.getElementById("renda-liquida");
    const rendaBruta = removerFormatacao(rendaBrutaInput.value);
    const rendaLivrePosDescontos = removerFormatacao(rendaLiquidaInput.value); 

    if (isNaN(rendaBruta) || rendaBruta <= 0 || isNaN(rendaLivrePosDescontos) || rendaLivrePosDescontos <= 0) {
        erroContainer.innerHTML = "Por favor, insira valores válidos e positivos para Renda Bruta e Renda Líquida.";
        document.getElementById("resultados").style.display = "none";
        if (grafico) grafico.destroy();
        return;
    }

    const descontosObrigatoriosNaoDivida = rendaBruta - totalDividas - rendaLivrePosDescontos;
    const descontosObrigatoriosPlot = Math.max(0, descontosObrigatoriosNaoDivida);
    const rendaBaseParaComprometimento = rendaBruta - descontosObrigatoriosNaoDivida; 
    
    const limite35Percent = rendaBaseParaComprometimento * 0.35;
    const percentualComprometimento = (totalDividas / rendaBaseParaComprometimento) * 100;
    const reducaoPosAcao = Math.max(0, totalDividas - limite35Percent);
    const comprometimentoPosAcao = totalDividas - reducaoPosAcao;

    document.getElementById("resultados").style.display = "block";
    const formatBrl = val => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    document.getElementById("resultado-1").innerHTML = `<span style="font-size:1.5rem; font-weight:bold; color:#fff">${percentualComprometimento.toFixed(2)}%</span><br><span style="font-size:0.8rem; color:#bbb">Comprometimento</span>`;
    document.getElementById("resultado-1").className = "quadro " + (percentualComprometimento > 35 ? "vermelho" : "verde");
    
    document.getElementById("resultado-2").innerHTML = `<span style="font-size:1.2rem; font-weight:bold; color:#fff">${formatBrl(totalDividas)}</span><br><span style="font-size:0.8rem; color:#bbb">Total Dívidas</span>`;
    document.getElementById("resultado-3").innerHTML = `<span style="font-size:1.2rem; font-weight:bold; color:#fff">${formatBrl(reducaoPosAcao)}</span><br><span style="font-size:0.8rem; color:#bbb">Redução c/ Ação</span>`;
    document.getElementById("resultado-4").innerHTML = `<span style="font-size:1.2rem; font-weight:bold; color:#fff">${formatBrl(comprometimentoPosAcao)}</span><br><span style="font-size:0.8rem; color:#bbb">Após Ação</span>`;

    const mensagem = document.getElementById("mensagem-status");
    if (percentualComprometimento > 35) {
        mensagem.className = "texto-explicativo vermelho";
        mensagem.innerHTML = `<b>Alerta!</b> Seu comprometimento está acima do limite de 35% sobre a renda disponível.<br>Você tem chances reais de se enquadrar na <b>Lei do Superendividamento</b> e reduzir os valores.`;
        document.getElementById("whatsapp-btn").style.display = "inline-flex";
    } else {
        mensagem.className = "texto-explicativo verde";
        mensagem.innerHTML = `Seu comprometimento está dentro do limite de 35% sobre a renda disponível. No momento, a Lei do Superendividamento pode não se aplicar diretamente ao seu caso.`;
        document.getElementById("whatsapp-btn").style.display = "none";
    }

    renderizarGrafico(rendaBruta, rendaLivrePosDescontos, totalDividas, comprometimentoPosAcao, percentualComprometimento, descontosObrigatoriosPlot, reducaoPosAcao);
}

function renderizarGrafico(rendaBruta, rendaLivrePosDescontos, totalDividas, comprometimentoPosAcao, percentualComprometimento, descontosObrigatoriosPlot, reducaoPosAcao) {
    const formatBrl = val => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const ctx = document.getElementById('grafico-renda').getContext('2d');
    
    if (grafico) grafico.destroy();
    
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    const isMobile = window.innerWidth <= 768;
    const labels = [['Situação', 'Atual']];
    if (percentualComprometimento > 35) { labels.push(['Pós-Ação', '(Estimado)']); }

    const datasets = [
      {
        label: 'Descontos Obrigatórios',
        data: percentualComprometimento > 35 ? [descontosObrigatoriosPlot, descontosObrigatoriosPlot] : [descontosObrigatoriosPlot],
        backgroundColor: '#555'
      },
      {
        label: 'Parcelas de Dívidas',
        data: percentualComprometimento > 35 ? [totalDividas, comprometimentoPosAcao] : [totalDividas],
        backgroundColor: '#e74c3c'
      },
      {
        label: 'Renda Livre',
        data: percentualComprometimento > 35 ? [rendaLivrePosDescontos, rendaLivrePosDescontos + reducaoPosAcao] : [rendaLivrePosDescontos],
        backgroundColor: '#28a745'
      }
    ];

    grafico = new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: {
          x: {
            stacked: true,
            ticks: { display: false },
            grid: { display: false },
            max: rendaBruta
          },
          y: {
            stacked: true,
            ticks: { color: '#fff', font: { family: 'Figtree', size: isMobile ? 12 : 14 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#fff', font: { family: 'Figtree' } }
          },
          datalabels: {
            anchor: 'start',
            color: '#fff',
            align: 'right',
            font: { family: 'Figtree', weight: 'bold', size: isMobile ? 10 : 12 },
            formatter: function(value) { return value > 0 ? formatBrl(value) : ''; },
            display: function(context) {
              const value = context.dataset.data[context.dataIndex];
              return value > context.chart.scales.x.max * 0.05; // Só exibe se a barra for larguinha
            }
          }
        }
      }
    });
}

function redirecionarWhatsApp() {
    const comprometimentoAtual = document.getElementById("resultado-1").innerText.replace("Comprometimento", "").trim();
    const totalDividas = document.getElementById("resultado-2").innerText.replace("Total Dívidas", "").trim();
    const reducaoPossivel = document.getElementById("resultado-3").innerText.replace("Redução c/ Ação", "").trim();
    const comprometimentoPosAcao = document.getElementById("resultado-4").innerText.replace("Após Ação", "").trim();

    const mensagemWhatsApp = `Olá! Fiz o cálculo da *Lei do Superendividamento* e o resultado foi:\n\n`+
        `📊 Comprometimento Atual: ${comprometimentoAtual}\n`+
        `💸 Total de Dívidas: ${totalDividas}\n`+
        `📉 Redução Possível: ${reducaoPossivel}\n`+
        `✅ Comprometimento Pós-Ação: ${comprometimentoPosAcao}\n\n`+
        `Gostaria de falar com um especialista.`;

    const numeroTelefone = "554284391133";
    const urlWhatsApp = `https://wa.me/${numeroTelefone}?text=${encodeURIComponent(mensagemWhatsApp)}`;
    window.open(urlWhatsApp, '_blank');
}