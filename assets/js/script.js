const inicio = new Date(2026, 2, 11);

let dataAtual = new Date();

const mesesNome = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const defaultConfig = {
  nomeUsuario: "",
  egoOffsetMin: 100,
  basOffsetMin: 70,
  arrumarOffsetMin: 60
};

let configAtual = carregarConfigLocal();
let usuarioAtual = null;
let cardExpandidoData = null;
let registroEditandoData = null;
let viagemEditandoId = null;
let viagensRegistros = carregarViagensLocal();

const pdfInput = document.getElementById("pdfInput");
const uploadHint = document.getElementById("uploadHint");

const settingsModal = document.getElementById("settingsModal");
const openSettingsBtn = document.getElementById("openSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const saveSettingsBtn = document.getElementById("saveSettings");
const logoutGoogleBtn = document.getElementById("logoutGoogle");
const applyRetroactiveInput = document.getElementById("applyRetroactive");
const lightModeToggle = document.getElementById("lightModeToggle");

const egoHoursInput = document.getElementById("egoHours");
const egoMinutesInput = document.getElementById("egoMinutes");
const basHoursInput = document.getElementById("basHours");
const basMinutesInput = document.getElementById("basMinutes");
const arrumarHoursInput = document.getElementById("arrumarHours");
const arrumarMinutesInput = document.getElementById("arrumarMinutes");
const nomeUsuarioInput = document.getElementById("nomeUsuario");
const nomeAtualConfiguradoSpan = document.getElementById("nomeAtualConfigurado");
const filtroDiasKey = "escalaFiltroOcultarPassados";
const temaClaroKey = "escalaTemaClaro";
const editModal = document.getElementById("editModal");
const closeEditModalBtn = document.getElementById("closeEditModal");
const cancelEditModalBtn = document.getElementById("cancelEditModal");
const saveEditModalBtn = document.getElementById("saveEditModal");
const editDataInput = document.getElementById("editData");
const editStatusInput = document.getElementById("editStatus");
const editEntradaInput = document.getElementById("editEntrada");
const editSaidaInput = document.getElementById("editSaida");
const editLocalInput = document.getElementById("editLocal");
const editMonitorInput = document.getElementById("editMonitor");
const editSairCasaInput = document.getElementById("editSairCasa");
const editArrumarInput = document.getElementById("editArrumar");
const pageEscala = document.getElementById("pageEscala");
const pageViagens = document.getElementById("pageViagens");
const routeMenuToggle = document.getElementById("routeMenuToggle");
const routeMenuList = document.getElementById("routeMenuList");
const routeMenuLabel = document.getElementById("routeMenuLabel");
const viagemForm = document.getElementById("viagemForm");
const viagemDataInput = document.getElementById("viagemData");
const viagemPrefixoInput = document.getElementById("viagemPrefixo");
const viagemTremIdInput = document.getElementById("viagemTremId");
const viagemEstacaoInicialInput = document.getElementById("viagemEstacaoInicial");
const viagemHoraInicioInput = document.getElementById("viagemHoraInicio");
const viagemEstacaoFinalInput = document.getElementById("viagemEstacaoFinal");
const viagemHoraFinalInput = document.getElementById("viagemHoraFinal");
const viagemObservacaoInput = document.getElementById("viagemObservacao");
const filtroDiaViagensInput = document.getElementById("filtroDiaViagens");
const viagensTabelaContainer = document.getElementById("viagensTabelaContainer");
const editViagemModal = document.getElementById("editViagemModal");
const closeEditViagemModalBtn = document.getElementById("closeEditViagemModal");
const cancelEditViagemModalBtn = document.getElementById("cancelEditViagemModal");
const saveEditViagemModalBtn = document.getElementById("saveEditViagemModal");
const editViagemDataInput = document.getElementById("editViagemData");
const editViagemPrefixoInput = document.getElementById("editViagemPrefixo");
const editViagemTremIdInput = document.getElementById("editViagemTremId");
const editViagemEstacaoInicialInput = document.getElementById("editViagemEstacaoInicial");
const editViagemHoraInicioInput = document.getElementById("editViagemHoraInicio");
const editViagemEstacaoFinalInput = document.getElementById("editViagemEstacaoFinal");
const editViagemHoraFinalInput = document.getElementById("editViagemHoraFinal");
const editViagemObservacaoInput = document.getElementById("editViagemObservacao");
const viewObservacaoModal = document.getElementById("viewObservacaoModal");
const closeViewObservacaoModalBtn = document.getElementById("closeViewObservacaoModal");
const okViewObservacaoModalBtn = document.getElementById("okViewObservacaoModal");
const observacaoConteudo = document.getElementById("observacaoConteudo");
const scrollTopBtn = document.getElementById("scrollTopBtn");

pdfInput.addEventListener("change", async (e) => {
  const files = [...e.target.files];

  if (!files.length) {
    uploadHint.innerText = "Toque para importar um ou mais arquivos";
    return;
  }

  uploadHint.innerText = `${files.length} arquivo${files.length > 1 ? "s" : ""} selecionado${files.length > 1 ? "s" : ""}`;

  if (!configAtual.nomeUsuario) {
    alert("Configure o nome do usuário antes de importar PDFs.");
    return;
  }

  for (let file of files) {
    const texto = await extrairTextoPDF(file);
    await processarTexto(texto);
  }

  await carregarDados();
  render();
});

openSettingsBtn.addEventListener("click", abrirConfiguracoes);
closeSettingsBtn.addEventListener("click", fecharConfiguracoes);

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    fecharConfiguracoes();
  }
});

saveSettingsBtn.addEventListener("click", async () => {
  const novaConfig = lerConfigDoFormulario();

  if (!novaConfig) return;

  await salvarConfigUsuario(novaConfig);
  configAtual = novaConfig;

  const temaClaroAtivo = Boolean(lightModeToggle?.checked);
  salvarTemaLocal(temaClaroAtivo);
  aplicarTema(temaClaroAtivo);

  const aplicarRetroativo = applyRetroactiveInput.checked;

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.innerText = aplicarRetroativo ? "Atualizando registros..." : "Salvando...";

  if (aplicarRetroativo) {
    await recalcularRegistrosAntigos();
  }

  await carregarDados();
  render();

  saveSettingsBtn.disabled = false;
  saveSettingsBtn.innerText = "Confirmar configurações";

  fecharConfiguracoes();
});

logoutGoogleBtn?.addEventListener("click", async () => {
  try {
    await firebase.auth().signOut();
    limparDadosEscalaLocal();
    render();
    fecharConfiguracoes();
  } catch (erro) {
    console.error("Erro ao deslogar do Google:", erro);
    alert("Não foi possível deslogar agora. Tente novamente.");
  }
});

closeEditModalBtn?.addEventListener("click", fecharModalEdicao);
cancelEditModalBtn?.addEventListener("click", fecharModalEdicao);

editModal?.addEventListener("click", (e) => {
  if (e.target === editModal) {
    fecharModalEdicao();
  }
});

saveEditModalBtn?.addEventListener("click", salvarEdicaoRegistro);
window.addEventListener("hashchange", aplicarRotaPelaHash);

routeMenuToggle?.addEventListener("click", () => {
  const aberto = routeMenuList?.classList.toggle("aberto");
  routeMenuToggle.setAttribute("aria-expanded", aberto ? "true" : "false");
  routeMenuList?.setAttribute("aria-hidden", aberto ? "false" : "true");
});

document.addEventListener("click", (event) => {
  if (!routeMenuList || !routeMenuToggle) return;
  const container = routeMenuToggle.closest(".route-menu");
  if (!container?.contains(event.target)) {
    routeMenuList.classList.remove("aberto");
    routeMenuToggle.setAttribute("aria-expanded", "false");
    routeMenuList.setAttribute("aria-hidden", "true");
  }
});

document.querySelectorAll(".route-option").forEach((botao) => {
  botao.addEventListener("click", () => {
    navegarPara(botao.dataset.route);
    routeMenuList?.classList.remove("aberto");
    routeMenuToggle?.setAttribute("aria-expanded", "false");
    routeMenuList?.setAttribute("aria-hidden", "true");
  });
});

viagemForm?.addEventListener("submit", salvarNovaViagem);
filtroDiaViagensInput?.addEventListener("change", renderTabelaViagens);
closeEditViagemModalBtn?.addEventListener("click", fecharModalEdicaoViagem);
cancelEditViagemModalBtn?.addEventListener("click", fecharModalEdicaoViagem);
saveEditViagemModalBtn?.addEventListener("click", salvarEdicaoViagem);
closeViewObservacaoModalBtn?.addEventListener("click", fecharModalObservacao);
okViewObservacaoModalBtn?.addEventListener("click", fecharModalObservacao);
lightModeToggle?.addEventListener("change", () => {
  const ativo = lightModeToggle.checked;
  aplicarTema(ativo);
  salvarTemaLocal(ativo);
});

viewObservacaoModal?.addEventListener("click", (e) => {
  if (e.target === viewObservacaoModal) {
    fecharModalObservacao();
  }
});

scrollTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", controlarBotaoTopo);
controlarBotaoTopo();
aplicarTema(carregarTemaLocal());

editViagemModal?.addEventListener("click", (e) => {
  if (e.target === editViagemModal) {
    fecharModalEdicaoViagem();
  }
});

[viagemHoraInicioInput, viagemHoraFinalInput, editViagemHoraInicioInput, editViagemHoraFinalInput].forEach((input) => {
  if (!input) return;
  input.addEventListener("input", () => aplicarMascaraHora(input));
});

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    usuarioAtual = user;
    document.querySelector(".btn-google").style.display = "none";
    if (logoutGoogleBtn) logoutGoogleBtn.style.display = "inline-flex";
    init();
  } else {
    usuarioAtual = null;
    document.querySelector(".btn-google").style.display = "flex";
    if (logoutGoogleBtn) logoutGoogleBtn.style.display = "none";
    limparDadosEscalaLocal();
    render();
  }
});

function limparDadosEscalaLocal() {
  localStorage.setItem("escala", "[]");
  localStorage.setItem("viagensRegistros", "[]");
  viagensRegistros = [];
}

async function carregarDados() {
  const snapshot = await db.collection("escala").get();

  const dados = [];

  snapshot.forEach(doc => {
    dados.push(doc.data());
  });

  localStorage.setItem("escala", JSON.stringify(dados));
}

async function extrairTextoPDF(file) {
  const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;

  let texto = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();

    conteudo.items.forEach(item => {
      texto += item.str + " ";
    });
  }

  return texto;
}

function criarDataLocal(yyyy, mm, dd) {
  return new Date(yyyy, mm - 1, dd);
}

function formatKey(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

function parseDataEscala(data) {
  const partes = obterPartesData(data);
  if (!partes) return null;
  return new Date(partes.ano, partes.mes - 1, partes.dia);
}

function inicioDoDia(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function obterPartesData(data) {
  if (!data) return null;

  if (data instanceof Date) {
    if (Number.isNaN(data.getTime())) return null;
    return {
      ano: data.getFullYear(),
      mes: data.getMonth() + 1,
      dia: data.getDate()
    };
  }

  if (typeof data === "object" && Number.isFinite(data.seconds)) {
    return obterPartesData(new Date(data.seconds * 1000));
  }

  if (typeof data === "number") {
    return obterPartesData(new Date(data));
  }

  if (typeof data === "string") {
    const valor = data.trim();

    const isoMatch = valor.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const partesIso = {
        ano: Number(isoMatch[1]),
        mes: Number(isoMatch[2]),
        dia: Number(isoMatch[3])
      };
      return partesDataValidas(partesIso) ? partesIso : null;
    }

    // Formato americano vindo do Firestore: MM/DD/YYYY
    const usMatch = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const partesUs = {
        ano: Number(usMatch[3]),
        mes: Number(usMatch[1]),
        dia: Number(usMatch[2])
      };
      return partesDataValidas(partesUs) ? partesUs : null;
    }

    const parsed = new Date(valor);
    if (!Number.isNaN(parsed.getTime())) {
      const partesParse = obterPartesData(parsed);
      return partesParse && partesDataValidas(partesParse) ? partesParse : null;
    }
  }

  return null;
}

function partesDataValidas(partes) {
  if (!partes) return false;
  const { ano, mes, dia } = partes;

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return false;
  if (ano < 1900 || ano > 3000) return false;
  if (mes < 1 || mes > 12) return false;

  const maxDia = new Date(ano, mes, 0).getDate();
  return dia >= 1 && dia <= maxDia;
}

function compararPartesData(a, b) {
  if (!a || !b) return 0;
  if (a.ano !== b.ano) return a.ano - b.ano;
  if (a.mes !== b.mes) return a.mes - b.mes;
  return a.dia - b.dia;
}

function partesParaNumero(data) {
  const partes = obterPartesData(data);
  if (!partes) return null;
  return partes.ano * 10000 + partes.mes * 100 + partes.dia;
}

function processarTexto(texto) {
  const ano = new Date().getFullYear();

  const dataMatch = texto.match(/\d{1,2}\/\d{1,2}/);
  if (!dataMatch) return;

  const [dia, mes] = dataMatch[0].split("/");
  const dateObj = criarDataLocal(ano, Number(mes), Number(dia));
  const data = formatKey(dateObj);

  const nomeUsuarioConfigurado = (configAtual.nomeUsuario || "").trim().toUpperCase();
  if (!nomeUsuarioConfigurado) return;
  const textoNormalizado = texto.toUpperCase();
  const indexNome = textoNormalizado.indexOf(nomeUsuarioConfigurado);

  if (indexNome === -1) {
    salvar({ data, status: "FOLGA" });
    return;
  }

  const resto = texto.slice(indexNome);
  const corte = resto.search(/\s\d{2,3}\s[A-Z]{2}\d{3}/);
  const trecho = corte !== -1 ? resto.slice(0, corte) : resto.slice(0, 200);

  const horas = trecho.match(/\d{1,2}:\d{2}/g) || [];
  const entrada = horas[0] || "-";
  const saida = horas[1] || "-";

  let local = trecho.includes("BAS") ? "BAS" :
    trecho.includes("EGO") ? "EGO" : "-";

  let monitor = "-";

  const match = trecho.match(/(BAS|EGO)\s+\w+\s+([A-Z\s]+)/);

  if (match) {
    monitor = match[2].trim();

    monitor = monitor.split(/\s+\d{2,3}\s/)[0];
    monitor = monitor.split("CONTROLE")[0];

    monitor = monitor.trim();
  }

  const sairCasa = calcularSaidaCasa(entrada, local);
  const arrumar = calcularArrumar(sairCasa);

  salvar({
    data,
    entrada,
    saida,
    local,
    monitor,
    sairCasa,
    arrumar,
    status: "TRABALHO"
  });
}

function calcularSaidaCasa(entrada, local) {
  if (entrada === "-") return "-";

  let [h, m] = entrada.split(":").map(Number);
  let d = new Date();
  d.setHours(h, m);

  if (local === "BAS") d.setMinutes(d.getMinutes() - configAtual.basOffsetMin);
  if (local === "EGO") d.setMinutes(d.getMinutes() - configAtual.egoOffsetMin);

  return d.toTimeString().slice(0, 5);
}

function calcularArrumar(sairCasa) {
  if (sairCasa === "-") return "-";

  let [h, m] = sairCasa.split(":").map(Number);
  let d = new Date();
  d.setHours(h, m - configAtual.arrumarOffsetMin);

  return d.toTimeString().slice(0, 5);
}

async function recalcularRegistrosAntigos() {
  const snapshot = await db.collection("escala").where("status", "==", "TRABALHO").get();
  const atualizacoes = [];

  snapshot.forEach((doc) => {
    const dado = doc.data();

    const novoSairCasa = calcularSaidaCasa(dado.entrada || "-", dado.local || "-");
    const novoArrumar = calcularArrumar(novoSairCasa);

    atualizacoes.push(
      db.collection("escala").doc(doc.id).set({
        ...dado,
        sairCasa: novoSairCasa,
        arrumar: novoArrumar
      })
    );
  });

  await Promise.all(atualizacoes);
}

async function salvar(dado) {
  await db.collection("escala").doc(dado.data).set(dado);
}

function getStatus(data) {
  if (data < inicio) return "NONE";
  const diff = Math.floor((data - inicio) / 86400000);
  return diff % 8 < 6 ? "WORK" : "OFF";
}

function mudarMes(v) {
  dataAtual.setMonth(dataAtual.getMonth() + v);
  renderCalendar();
}

function render() {
  aplicarRotaPelaHash();
  renderCalendar();
  renderLista();
  renderTabelaViagens();
}

function renderCalendar() {
  const cal = document.getElementById("calendar");
  const mesLabel = document.getElementById("mesAtual");

  cal.innerHTML = "";

  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  mesLabel.innerText = `${mesesNome[mes]} de ${ano}`;

  const dias = new Date(ano, mes + 1, 0).getDate();
  const hoje = formatKey(new Date());

  let dados = JSON.parse(localStorage.getItem("escala")) || [];

  const primeiroDia = new Date(ano, mes, 1).getDay();

  for (let i = 0; i < primeiroDia; i++) {
    const vazio = document.createElement("div");
    vazio.className = "empty-day";
    cal.appendChild(vazio);
  }

  for (let i = 1; i <= dias; i++) {
    const d = new Date(ano, mes, i);
    const key = formatKey(d);

    const registro = dados.find(x => x.data === key);

    const div = document.createElement("div");
    div.className = "day";
    div.onclick = () => irParaData(key);

    if (key === hoje) div.classList.add("today");

    const status = getStatus(d);

    if (status === "WORK") div.classList.add("work-day");
    else if (status === "OFF") div.classList.add("off-day");
    else div.classList.add("none-day");

    div.innerHTML = `
      <div class="day-topo">
        <div class="day-num">${i}</div>
        ${registro ? `<div class="dot"></div>` : ""}
      </div>
      <div class="day-info">
        ${registro?.local || ""}
        ${registro?.entrada ? `<br>${registro.entrada}` : ""}
      </div>
    `;

    cal.appendChild(div);
  }
}

function renderLista() {
  const lista = document.getElementById("lista");

  let dados = JSON.parse(localStorage.getItem("escala") || "[]");
  dados.sort((a, b) => {
    const aData = parseDataEscala(a.data);
    const bData = parseDataEscala(b.data);

    if (!aData && !bData) return 0;
    if (!aData) return 1;
    if (!bData) return -1;

    return aData - bData;
  });
  const ocultarPassados = localStorage.getItem(filtroDiasKey) === "1";
  const hoje = formatKey(new Date());

  lista.innerHTML = `
    <div class="lista-topo">
      <div>
        <div class="lista-titulo">Próximos detalhes da escala</div>
        <div class="lista-subtitulo">Toque em um mês para ver os dias.</div>
      </div>
      <div class="lista-badge" id="listaBadgeCount">0 registros</div>
    </div>
    <div class="lista-filtros">
      <label class="filtro-passados">
        <input type="checkbox" id="ocultarPassados" ${ocultarPassados ? "checked" : ""}>
        <span>Ocultar dias que já passaram</span>
      </label>
    </div>
  `;

  lista.innerHTML += renderEscalaHoje(dados, hoje);

  if (!dados.length) {
    atualizarBadgeLista(0);
    lista.innerHTML += '<div class="lista-vazia">Nenhum registro encontrado. Importe um PDF para preencher sua escala.</div>';
    return;
  }

  const agrupado = {};

  dados.forEach(d => {
    const date = parseDataEscala(d.data);
    if (!date) return;

    const ano = date.getFullYear();
    const mes = date.getMonth();

    if (!agrupado[ano]) agrupado[ano] = {};
    if (!agrupado[ano][mes]) agrupado[ano][mes] = [];

    agrupado[ano][mes].push(d);
  });

  Object.keys(agrupado).forEach(ano => {
    const anoBloco = document.createElement("section");
    anoBloco.className = "ano-bloco";

    const anoHeader = document.createElement("div");
    anoHeader.className = "ano-header";
    anoHeader.innerText = ano;

    anoBloco.appendChild(anoHeader);

    Object.keys(agrupado[ano]).forEach(mes => {

      const mesId = `mes-${ano}-${mes}`;

      const mesHeader = document.createElement("div");
      mesHeader.className = "mes-header";
      mesHeader.innerText = `${mesesNome[mes]} de ${ano}`;
      mesHeader.onclick = () => toggleMes(mesId);

      const conteudo = document.createElement("div");
      conteudo.className = "mes-conteudo";
      conteudo.id = mesId;

      const mesInner = document.createElement("div");
      mesInner.className = "mes-inner";

      if (ano == new Date().getFullYear() && mes == new Date().getMonth()) {
        conteudo.classList.add("ativo");
        mesHeader.classList.add("aberto");
      }

      agrupado[ano][mes].forEach(d => {

        const div = document.createElement("div");
        div.className = "card";
        div.id = "dia-" + d.data;
        div.dataset.data = d.data;
        div.addEventListener("click", () => toggleCardExpansao(div));

        if (d.data === hoje) div.classList.add("today");

        if (d.status === "FOLGA") {
          div.innerHTML = `
            <div class="card-topo">
              <div class="card-data">${formatarData(d.data)}</div>
              <div class="card-badge folga">Folga</div>
            </div>
            <div class="card-linha folga">Dia livre para descansar ou planejar a próxima jornada.</div>
            <div class="card-extra">
              <div class="card-extra-inner">
                <button class="btn-editar-dia" type="button" data-action="editar">Editar este dia</button>
              </div>
            </div>
          `;
        } else {
          div.innerHTML = `
            <div class="card-topo">
              <div class="card-data">${formatarData(d.data)}</div>
              <div class="card-badge trabalho">Trabalho</div>
            </div>
            <div class="card-grid">
              <div class="card-linha"><strong>Entrada</strong>${d.entrada}</div>
              <div class="card-linha"><strong>Saída</strong>${d.saida}</div>
              <div class="card-linha"><strong>Local</strong>${d.local}</div>
              <div class="card-linha"><strong>Monitor</strong>${d.monitor}</div>
              <div class="card-linha"><strong>Sair de casa</strong>${d.sairCasa}</div>
              <div class="card-linha"><strong>Começar a arrumar</strong>${d.arrumar}</div>
            </div>
            <div class="card-extra">
              <div class="card-extra-inner">
                <button class="btn-editar-dia" type="button" data-action="editar">Editar este dia</button>
              </div>
            </div>
          `;
        }

        const botaoEditar = div.querySelector('[data-action="editar"]');
        botaoEditar?.addEventListener("click", (event) => {
          event.stopPropagation();
          abrirModalEdicao(d.data);
        });

        if (cardExpandidoData === d.data) {
          div.classList.add("expanded");
        }

        mesInner.appendChild(div);
      });


      conteudo.appendChild(mesInner);

      anoBloco.appendChild(mesHeader);
      anoBloco.appendChild(conteudo);
    });

    lista.appendChild(anoBloco);
  });

  aplicarFiltroDiasPassadosNoDOM();

    const filtroPassadosInput = document.getElementById("ocultarPassados");
    filtroPassadosInput?.addEventListener("change", (event) => {
      localStorage.setItem(filtroDiasKey, event.target.checked ? "1" : "0");
      aplicarFiltroDiasPassadosNoDOM();
    });
}

function toggleCardExpansao(card) {
  const dataCard = card?.dataset?.data;
  if (!dataCard) return;

  const jaExpandido = card.classList.contains("expanded");

  document.querySelectorAll("#lista .card.expanded").forEach((el) => {
    el.classList.remove("expanded");
  });

  if (jaExpandido) {
    cardExpandidoData = null;
    return;
  }

  card.classList.add("expanded");
  cardExpandidoData = dataCard;
}

function atualizarBadgeLista(total) {
  const badge = document.getElementById("listaBadgeCount");
  if (!badge) return;
  badge.innerText = `${total} registro${total === 1 ? "" : "s"}`;
}

function aplicarFiltroDiasPassadosNoDOM() {
  const ocultarPassados = localStorage.getItem(filtroDiasKey) === "1";
  const hojeNumero = partesParaNumero(new Date());
  if (!hojeNumero) return;

  let totalVisiveis = 0;

  document.querySelectorAll("#lista .card").forEach((card) => {
    const numeroCard = partesParaNumero(card.dataset.data);
    if (numeroCard === null) return;

    const esconder = ocultarPassados && numeroCard < hojeNumero;

    card.style.display = esconder ? "none" : "";

    if (!esconder) {
      totalVisiveis += 1;
    }
  });

  document.querySelectorAll("#lista .mes-conteudo").forEach((conteudo) => {
    const cardsVisiveis = [...conteudo.querySelectorAll(".card")].some(
      (card) => card.style.display !== "none"
    );

    const headerMes = conteudo.previousElementSibling;
    if (!cardsVisiveis) {
      conteudo.style.display = "none";
      if (headerMes) headerMes.style.display = "none";
      return;
    }

    conteudo.style.display = "";
    if (headerMes) headerMes.style.display = "";
  });

  document.querySelectorAll("#lista .ano-bloco").forEach((anoBloco) => {
    const temMesVisivel = [...anoBloco.querySelectorAll(".mes-header")].some(
      (mesHeader) => mesHeader.style.display !== "none"
    );
    anoBloco.style.display = temMesVisivel ? "" : "none";
  });

  atualizarBadgeLista(totalVisiveis);
}

function renderEscalaHoje(dados, hoje) {
  const hojeNumero = partesParaNumero(hoje);
  const registroHoje = dados.find((d) => partesParaNumero(d.data) === hojeNumero);

  if (!registroHoje) {
    return `
      <section class="escala-hoje sem-registro">
        <div class="escala-hoje-titulo">Escala de hoje</div>
        <div class="escala-hoje-linha">Hoje (${formatarData(hoje)}) ainda não possui registro importado.</div>
      </section>
    `;
  }

  if (registroHoje.status === "FOLGA") {
    return `
      <section class="escala-hoje">
        <div class="escala-hoje-topo">
          <div class="escala-hoje-titulo">Escala de hoje</div>
          <div class="card-badge folga">Folga</div>
        </div>
        <div class="escala-hoje-linha">Data: ${formatarData(registroHoje.data)}</div>
        <div class="escala-hoje-linha">Dia livre para descansar.</div>
      </section>
    `;
  }

  return `
    <section class="escala-hoje">
      <div class="escala-hoje-topo">
        <div class="escala-hoje-titulo">Escala de hoje</div>
        <div class="card-badge trabalho">Trabalho</div>
      </div>
      <div class="escala-hoje-grid">
        <div class="card-linha"><strong>Entrada</strong>${registroHoje.entrada || "-"}</div>
        <div class="card-linha"><strong>Saída</strong>${registroHoje.saida || "-"}</div>
        <div class="card-linha"><strong>Local</strong>${registroHoje.local || "-"}</div>
        <div class="card-linha"><strong>Sair de casa</strong>${registroHoje.sairCasa || "-"}</div>
      </div>
    </section>
  `;
}

function toggleMes(id) {
  const conteudo = document.getElementById(id);
  const header = conteudo?.previousElementSibling;

  if (!conteudo) return;

  conteudo.classList.toggle("ativo");
  header?.classList.toggle("aberto", conteudo.classList.contains("ativo"));
}

function formatarData(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function irParaHoje() {
  const hoje = new Date();
  const key = formatKey(hoje);

  document.querySelectorAll(".mes-conteudo")
    .forEach(el => {
      el.classList.remove("ativo");
      el.previousElementSibling?.classList.remove("aberto");
    });

  const mesAtualId = `mes-${hoje.getFullYear()}-${hoje.getMonth()}`;
  const mesAtual = document.getElementById(mesAtualId);

  if (mesAtual) {
    mesAtual.classList.add("ativo");
    mesAtual.previousElementSibling?.classList.add("aberto");

    setTimeout(() => {
      const el = document.getElementById("dia-" + key);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }, 100);
  }
}

function irParaData(dataStr) {
  const [ano, mes] = dataStr.split("-");

  document.querySelectorAll(".mes-conteudo")
    .forEach(el => {
      el.classList.remove("ativo");
      el.previousElementSibling?.classList.remove("aberto");
    });

  const mesId = `mes-${ano}-${Number(mes) - 1}`;
  const mesEl = document.getElementById(mesId);

  if (mesEl) {
    mesEl.classList.add("ativo");
    mesEl.previousElementSibling?.classList.add("aberto");

    setTimeout(() => {
      const el = document.getElementById("dia-" + dataStr);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        setTimeout(() => {
          el.classList.add("flash");

          setTimeout(() => {
            el.classList.remove("flash");
          }, 1200);
        }, 500);
      }
    }, 100);
  }
}

function abrirConfiguracoes() {
  preencherFormularioConfiguracao();
  settingsModal.classList.add("aberto");
  settingsModal.setAttribute("aria-hidden", "false");
}

function fecharConfiguracoes() {
  settingsModal.classList.remove("aberto");
  settingsModal.setAttribute("aria-hidden", "true");
  applyRetroactiveInput.checked = false;
}

function carregarTemaLocal() {
  return localStorage.getItem(temaClaroKey) === "1";
}

function salvarTemaLocal(ativo) {
  localStorage.setItem(temaClaroKey, ativo ? "1" : "0");
}

function aplicarTema(modoClaro) {
  document.body.classList.toggle("light-mode", Boolean(modoClaro));
}

function carregarConfigLocal() {
  const raw = localStorage.getItem("escalaConfig");

  if (!raw) return { ...defaultConfig };

  try {
    const parsed = JSON.parse(raw);

    return {
      nomeUsuario: typeof parsed.nomeUsuario === "string" ? parsed.nomeUsuario.trim().toUpperCase() : defaultConfig.nomeUsuario,
      egoOffsetMin: Number.isFinite(parsed.egoOffsetMin) ? parsed.egoOffsetMin : defaultConfig.egoOffsetMin,
      basOffsetMin: Number.isFinite(parsed.basOffsetMin) ? parsed.basOffsetMin : defaultConfig.basOffsetMin,
      arrumarOffsetMin: Number.isFinite(parsed.arrumarOffsetMin) ? parsed.arrumarOffsetMin : defaultConfig.arrumarOffsetMin
    };
  } catch {
    return { ...defaultConfig };
  }
}

function salvarConfigLocal(config) {
  localStorage.setItem("escalaConfig", JSON.stringify(config));
}

async function carregarConfigUsuario() {
  if (!usuarioAtual) return { ...defaultConfig };

  try {
    const doc = await db.collection("config").doc("user").get();

    if (!doc.exists) {
      return { ...configAtual };
    }

    const dados = doc.data() || {};
    const configNormalizada = {
      nomeUsuario: typeof dados.nome === "string" ? dados.nome.trim().toUpperCase() : defaultConfig.nomeUsuario,
      egoOffsetMin: Number.isFinite(dados.egoOffsetMin) ? dados.egoOffsetMin : defaultConfig.egoOffsetMin,
      basOffsetMin: Number.isFinite(dados.basOffsetMin) ? dados.basOffsetMin : defaultConfig.basOffsetMin,
      arrumarOffsetMin: Number.isFinite(dados.arrumarOffsetMin) ? dados.arrumarOffsetMin : defaultConfig.arrumarOffsetMin
    };

    salvarConfigLocal(configNormalizada);
    return configNormalizada;
  } catch (erro) {
    console.warn("Não foi possível carregar configurações do banco. Usando cache local.", erro);
    return { ...configAtual };
  }
}

async function salvarConfigUsuario(config) {
  const configNormalizada = {
    nomeUsuario: (config.nomeUsuario || "").trim().toUpperCase(),
    egoOffsetMin: config.egoOffsetMin,
    basOffsetMin: config.basOffsetMin,
    arrumarOffsetMin: config.arrumarOffsetMin
  };

  if (usuarioAtual) {
    try {
      await db.collection("config").doc("user").set({
        nome: configNormalizada.nomeUsuario,
        egoOffsetMin: configNormalizada.egoOffsetMin,
        basOffsetMin: configNormalizada.basOffsetMin,
        arrumarOffsetMin: configNormalizada.arrumarOffsetMin
      }, { merge: true });
    } catch (erro) {
      console.warn("Não foi possível salvar configurações no banco. Configuração salva localmente.", erro);
    }
  }

  salvarConfigLocal(configNormalizada);
}

function preencherFormularioConfiguracao() {
  nomeUsuarioInput.value = configAtual.nomeUsuario;
  nomeAtualConfiguradoSpan.innerText = obterNomeExibicao(configAtual.nomeUsuario);

  const ego = paraHoraMinuto(configAtual.egoOffsetMin);
  const bas = paraHoraMinuto(configAtual.basOffsetMin);
  const arrumar = paraHoraMinuto(configAtual.arrumarOffsetMin);

  egoHoursInput.value = ego.h;
  egoMinutesInput.value = ego.m;

  basHoursInput.value = bas.h;
  basMinutesInput.value = bas.m;

  arrumarHoursInput.value = arrumar.h;
  arrumarMinutesInput.value = arrumar.m;

  if (lightModeToggle) {
    lightModeToggle.checked = carregarTemaLocal();
  }
}

function lerConfigDoFormulario() {
  const nomeUsuario = (nomeUsuarioInput.value || "").trim().toUpperCase();
  const egoOffsetMin = paraMinutosTotais(egoHoursInput.value, egoMinutesInput.value);
  const basOffsetMin = paraMinutosTotais(basHoursInput.value, basMinutesInput.value);
  const arrumarOffsetMin = paraMinutosTotais(arrumarHoursInput.value, arrumarMinutesInput.value);

  if (egoOffsetMin === null || basOffsetMin === null || arrumarOffsetMin === null) {
    alert("Preencha horas e minutos com valores válidos.");
    return null;
  }

  return {
    nomeUsuario,
    egoOffsetMin,
    basOffsetMin,
    arrumarOffsetMin
  };
}

function obterNomeExibicao(nome) {
  return nome ? nome : "(sem nome configurado)";
}

function abrirModalEdicao(data) {
  const dados = JSON.parse(localStorage.getItem("escala") || "[]");
  const registro = dados.find((item) => item.data === data);

  if (!registro) {
    alert("Registro não encontrado para edição.");
    return;
  }

  registroEditandoData = data;
  preencherFormularioEdicao(registro);
  editModal.classList.add("aberto");
  editModal.setAttribute("aria-hidden", "false");
}

function fecharModalEdicao() {
  registroEditandoData = null;
  editModal.classList.remove("aberto");
  editModal.setAttribute("aria-hidden", "true");
}

function preencherFormularioEdicao(registro) {
  const partesData = obterPartesData(registro.data);
  editDataInput.value = partesData ? formatKey(criarDataLocal(partesData.ano, partesData.mes, partesData.dia)) : "";
  editStatusInput.value = registro.status || "TRABALHO";
  editEntradaInput.value = registro.entrada || "-";
  editSaidaInput.value = registro.saida || "-";
  editLocalInput.value = registro.local || "-";
  editMonitorInput.value = registro.monitor || "-";
  editSairCasaInput.value = registro.sairCasa || "-";
  editArrumarInput.value = registro.arrumar || "-";
}

async function salvarEdicaoRegistro() {
  if (!registroEditandoData) return;

  const dados = JSON.parse(localStorage.getItem("escala") || "[]");
  const indice = dados.findIndex((item) => item.data === registroEditandoData);

  if (indice === -1) {
    alert("Não foi possível localizar o registro para salvar.");
    return;
  }

  const status = editStatusInput.value === "FOLGA" ? "FOLGA" : "TRABALHO";
  const partesNovaData = obterPartesData((editDataInput.value || "").trim());
  if (!partesNovaData) {
    alert("Informe uma data válida para o dia da escala.");
    return;
  }
  const novaData = formatKey(criarDataLocal(partesNovaData.ano, partesNovaData.mes, partesNovaData.dia));

  const conflitoData = dados.some((item, idx) => idx !== indice && item.data === novaData);
  if (conflitoData) {
    alert("Já existe um registro para esta data.");
    return;
  }

  const valorOuTraco = (valor) => {
    const limpo = (valor || "").trim();
    return limpo ? limpo : "-";
  };

  const registroAtualizado = {
    data: novaData,
    status,
    entrada: status === "FOLGA" ? "-" : valorOuTraco(editEntradaInput.value),
    saida: status === "FOLGA" ? "-" : valorOuTraco(editSaidaInput.value),
    local: status === "FOLGA" ? "-" : valorOuTraco(editLocalInput.value).toUpperCase(),
    monitor: status === "FOLGA" ? "-" : valorOuTraco(editMonitorInput.value),
    sairCasa: status === "FOLGA" ? "-" : valorOuTraco(editSairCasaInput.value),
    arrumar: status === "FOLGA" ? "-" : valorOuTraco(editArrumarInput.value)
  };

  saveEditModalBtn.disabled = true;
  saveEditModalBtn.innerText = "Salvando...";

  try {
    dados[indice] = registroAtualizado;
    localStorage.setItem("escala", JSON.stringify(dados));
    fecharModalEdicao();
    render();

    if (registroEditandoData !== novaData && usuarioAtual) {
      await db.collection("escala").doc(registroEditandoData).delete();
    }
    await salvar(registroAtualizado);
  } catch (erro) {
    console.error("Erro ao salvar edição do dia:", erro);
    alert("A escala foi atualizada localmente, mas não foi possível sincronizar com a nuvem agora.");
  } finally {
    saveEditModalBtn.disabled = false;
    saveEditModalBtn.innerText = "Salvar ajuste";
  }
}

function paraHoraMinuto(totalMin) {
  return {
    h: Math.floor(totalMin / 60),
    m: totalMin % 60
  };
}

function paraMinutosTotais(horasRaw, minutosRaw) {
  const horas = Number(horasRaw);
  const minutos = Number(minutosRaw);

  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) return null;
  if (horas < 0 || minutos < 0 || minutos > 59 || horas > 23) return null;

  return horas * 60 + minutos;
}

function navegarPara(rota) {
  const destino = rota === "viagens" ? "viagens" : "escala";
  if (window.location.hash !== `#${destino}`) {
    window.location.hash = destino;
    return;
  }
  aplicarRotaPelaHash();
}

function aplicarRotaPelaHash() {
  const rota = window.location.hash.replace("#", "") === "viagens" ? "viagens" : "escala";
  const mostrarViagens = rota === "viagens";

  pageEscala?.classList.toggle("ativo", !mostrarViagens);
  pageViagens?.classList.toggle("ativo", mostrarViagens);

  document.querySelectorAll(".route-option").forEach((item) => {
    const ativo = item.dataset.route === rota;
    item.classList.toggle("ativo", ativo);
  });

  if (routeMenuLabel) {
    routeMenuLabel.innerText = mostrarViagens ? "Viagens" : "Escala";
  }
}

function carregarViagensLocal() {
  try {
    const raw = localStorage.getItem("viagensRegistros") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarViagensLocal() {
  localStorage.setItem("viagensRegistros", JSON.stringify(viagensRegistros));
}

async function carregarViagens() {
  if (!usuarioAtual) {
    viagensRegistros = carregarViagensLocal();
    selecionarUltimoDiaViagens();
    renderTabelaViagens();
    return;
  }

  try {
    const snapshot = await db.collection("Prefix").get();
    viagensRegistros = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    salvarViagensLocal();
  } catch (erro) {
    console.warn("Não foi possível carregar viagens do banco. Usando cache local.", erro);
    viagensRegistros = carregarViagensLocal();
  }

  selecionarUltimoDiaViagens();
  renderTabelaViagens();
}

function selecionarUltimoDiaViagens() {
  if (!filtroDiaViagensInput || !viagemDataInput) return;

  const ultimoDia = [...viagensRegistros]
    .map((item) => item.data)
    .filter(Boolean)
    .sort()
    .at(-1);

  const dataPadrao = ultimoDia || formatKey(new Date());
  filtroDiaViagensInput.value = dataPadrao;
  viagemDataInput.value = dataPadrao;
}

async function salvarNovaViagem(event) {
  event.preventDefault();

  const payload = coletarDadosViagem({
    data: viagemDataInput.value,
    prefixo: viagemPrefixoInput.value,
    tremId: viagemTremIdInput.value,
    estacaoInicial: viagemEstacaoInicialInput.value,
    horaInicio: viagemHoraInicioInput.value,
    estacaoFinal: viagemEstacaoFinalInput.value,
    horaFinal: viagemHoraFinalInput.value,
    observacao: viagemObservacaoInput?.value
  });

  if (!payload) return;

  const registro = { ...payload, criadoEm: new Date().toISOString() };

  try {
    if (usuarioAtual) {
      const docRef = await db.collection("Prefix").add(registro);
      registro.id = docRef.id;
    } else {
      registro.id = (window.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    }

    viagensRegistros.push(registro);
    salvarViagensLocal();
    filtroDiaViagensInput.value = registro.data;
    viagemForm.reset();
    viagemDataInput.value = registro.data;
    renderTabelaViagens();
  } catch (erro) {
    console.error("Erro ao salvar viagem:", erro);
    alert("Não foi possível registrar a viagem agora.");
  }
}

function coletarDadosViagem(campos) {
  const data = (campos.data || "").trim();
  const prefixo = (campos.prefixo || "").trim().toUpperCase();
  const tremId = (campos.tremId || "").trim().toUpperCase();
  const estacaoInicial = (campos.estacaoInicial || "").trim();
  const horaInicio = normalizarHoraValida((campos.horaInicio || "").trim());
  const estacaoFinal = (campos.estacaoFinal || "").trim();
  const horaFinal = normalizarHoraValida((campos.horaFinal || "").trim());
  const observacao = (campos.observacao || "").trim();

  if (!horaInicio || !horaFinal) {
    alert("Horários inválidos. Use o formato HH:MM (00:00 até 23:59).");
    return null;
  }

  if (!data || !prefixo || !tremId || !estacaoInicial || !estacaoFinal) {
    alert("Preencha todos os campos da viagem com valores válidos.");
    return null;
  }

  return { data, prefixo, tremId, estacaoInicial, horaInicio, estacaoFinal, horaFinal, observacao };
}

function aplicarMascaraHora(input) {
  const digitos = (input.value || "").replace(/\D/g, "").slice(0, 4);
  if (digitos.length <= 2) {
    input.value = digitos;
    return;
  }
  input.value = `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

function normalizarHoraValida(valor) {
  const limpo = (valor || "").replace(/\D/g, "").slice(0, 4);
  if (limpo.length !== 4) return null;

  const horas = Number(limpo.slice(0, 2));
  const minutos = Number(limpo.slice(2, 4));

  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) return null;
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function renderTabelaViagens() {
  if (!viagensTabelaContainer) return;

  const diaSelecionado = filtroDiaViagensInput?.value;
  if (!diaSelecionado) {
    viagensTabelaContainer.innerHTML = '<div class="lista-vazia">Selecione um dia para visualizar os registros.</div>';
    return;
  }

  const registrosDia = viagensRegistros
    .filter((item) => item.data === diaSelecionado)
    .sort((a, b) => {
      const criadoA = new Date(a.criadoEm || 0).getTime();
      const criadoB = new Date(b.criadoEm || 0).getTime();
      if (criadoA !== criadoB) return criadoA - criadoB;
      return (a.horaInicio || "").localeCompare(b.horaInicio || "");
    });

  if (!registrosDia.length) {
    viagensTabelaContainer.innerHTML = `<div class="lista-vazia">Nenhuma viagem registrada em ${formatarData(diaSelecionado)}.</div>`;
    return;
  }

  viagensTabelaContainer.innerHTML = `
    <div class="viagens-table-wrap">
      <table class="viagens-table">
        <thead>
          <tr>
            <th>Dia</th>
            <th>Prefixo</th>
            <th>ID do Trem</th>
            <th>Estação Inicial</th>
            <th>Hora de Início</th>
            <th>Estação Final</th>
            <th>Hora Final</th>
            <th>Obs.</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${registrosDia.map((item) => `
            <tr>
              <td>${formatarData(item.data)}</td>
              <td>${item.prefixo || "-"}</td>
              <td>${item.tremId || "-"}</td>
              <td>${item.estacaoInicial || "-"}</td>
              <td>${item.horaInicio || "-"}</td>
              <td>${item.estacaoFinal || "-"}</td>
              <td>${item.horaFinal || "-"}</td>
              <td>
                <button type="button" class="btn-observacao ${item.observacao ? "ativo" : ""}" data-action="observacao" data-id="${item.id}" aria-label="Ver observação">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18.18 8.03933L18.6435 7.57589C19.4113 6.80804 20.6563 6.80804 21.4241 7.57589C22.192 8.34374 22.192 9.58868 21.4241 10.3565L20.9607 10.82M18.18 8.03933C18.18 8.03933 18.238 9.02414 19.1069 9.89309C19.9759 10.762 20.9607 10.82 20.9607 10.82M18.18 8.03933L13.9194 12.2999C13.6308 12.5885 13.4865 12.7328 13.3624 12.8919C13.2161 13.0796 13.0906 13.2827 12.9882 13.4975C12.9014 13.6797 12.8368 13.8732 12.7078 14.2604L12.2946 15.5L12.1609 15.901M20.9607 10.82L16.7001 15.0806C16.4115 15.3692 16.2672 15.5135 16.1081 15.6376C15.9204 15.7839 15.7173 15.9094 15.5025 16.0118C15.3203 16.0986 15.1268 16.1632 14.7396 16.2922L13.5 16.7054L13.099 16.8391M13.099 16.8391L12.6979 16.9728C12.5074 17.0363 12.2973 16.9867 12.1553 16.8447C12.0133 16.7027 11.9637 16.4926 12.0272 16.3021L12.1609 15.901M13.099 16.8391L12.1609 15.901" stroke="currentColor" stroke-width="1.5"/><path d="M8 13H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 9H14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 17H9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 14V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157M21 14C21 17.7712 21 19.6569 19.8284 20.8284M4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284M19.8284 20.8284C20.7715 19.8853 20.9554 18.4796 20.9913 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </td>
              <td class="viagens-acoes-cell">
                <button type="button" class="btn-editar-dia btn-acao-viagem" data-action="editar" data-id="${item.id}">Editar</button>
                <button type="button" class="btn-editar-dia btn-acao-viagem excluir" data-action="excluir" data-id="${item.id}">Excluir</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  viagensTabelaContainer.querySelectorAll('[data-action="observacao"]').forEach((botao) => {
    botao.addEventListener("click", () => abrirModalObservacao(botao.dataset.id));
  });

  viagensTabelaContainer.querySelectorAll('[data-action="editar"]').forEach((botao) => {
    botao.addEventListener("click", () => abrirModalEdicaoViagem(botao.dataset.id));
  });

  viagensTabelaContainer.querySelectorAll('[data-action="excluir"]').forEach((botao) => {
    botao.addEventListener("click", () => excluirViagem(botao.dataset.id));
  });
}

function abrirModalEdicaoViagem(id) {
  const registro = viagensRegistros.find((item) => item.id === id);
  if (!registro) return;

  viagemEditandoId = id;
  editViagemDataInput.value = registro.data || "";
  editViagemPrefixoInput.value = registro.prefixo || "";
  editViagemTremIdInput.value = registro.tremId || "";
  editViagemEstacaoInicialInput.value = registro.estacaoInicial || "";
  editViagemHoraInicioInput.value = registro.horaInicio || "";
  editViagemEstacaoFinalInput.value = registro.estacaoFinal || "";
  editViagemHoraFinalInput.value = registro.horaFinal || "";
  editViagemObservacaoInput.value = registro.observacao || "";
  editViagemModal.classList.add("aberto");
  editViagemModal.setAttribute("aria-hidden", "false");
}

function fecharModalEdicaoViagem() {
  viagemEditandoId = null;
  editViagemModal.classList.remove("aberto");
  editViagemModal.setAttribute("aria-hidden", "true");
}

async function salvarEdicaoViagem() {
  if (!viagemEditandoId) return;

  const payload = coletarDadosViagem({
    data: editViagemDataInput.value,
    prefixo: editViagemPrefixoInput.value,
    tremId: editViagemTremIdInput.value,
    estacaoInicial: editViagemEstacaoInicialInput.value,
    horaInicio: editViagemHoraInicioInput.value,
    estacaoFinal: editViagemEstacaoFinalInput.value,
    horaFinal: editViagemHoraFinalInput.value,
    observacao: editViagemObservacaoInput?.value
  });

  if (!payload) return;

  const indice = viagensRegistros.findIndex((item) => item.id === viagemEditandoId);
  if (indice === -1) return;

  const atualizado = { ...viagensRegistros[indice], ...payload };

  saveEditViagemModalBtn.disabled = true;
  saveEditViagemModalBtn.innerText = "Salvando...";

  try {
    viagensRegistros[indice] = atualizado;
    salvarViagensLocal();
    if (usuarioAtual) {
      await db.collection("Prefix").doc(viagemEditandoId).set(atualizado, { merge: true });
    }
    filtroDiaViagensInput.value = atualizado.data;
    fecharModalEdicaoViagem();
    renderTabelaViagens();
  } catch (erro) {
    console.error("Erro ao editar viagem:", erro);
    alert("Não foi possível salvar a edição da viagem.");
  } finally {
    saveEditViagemModalBtn.disabled = false;
    saveEditViagemModalBtn.innerText = "Salvar viagem";
  }
}

async function excluirViagem(id) {
  const confirmar = window.confirm("Deseja realmente excluir esta viagem?");
  if (!confirmar) return;

  try {
    viagensRegistros = viagensRegistros.filter((item) => item.id !== id);
    salvarViagensLocal();
    if (usuarioAtual) {
      await db.collection("Prefix").doc(id).delete();
    }
    selecionarUltimoDiaViagens();
    renderTabelaViagens();
  } catch (erro) {
    console.error("Erro ao excluir viagem:", erro);
    alert("Não foi possível excluir a viagem.");
  }
}

function abrirModalObservacao(id) {
  const registro = viagensRegistros.find((item) => item.id === id);
  if (!registro) return;

  observacaoConteudo.innerText = registro.observacao || "Esta viagem não possui observação.";
  viewObservacaoModal.classList.add("aberto");
  viewObservacaoModal.setAttribute("aria-hidden", "false");
}

function fecharModalObservacao() {
  viewObservacaoModal.classList.remove("aberto");
  viewObservacaoModal.setAttribute("aria-hidden", "true");
}

function controlarBotaoTopo() {
  if (!scrollTopBtn) return;
  const mostrar = window.scrollY > 260;
  scrollTopBtn.classList.toggle("visivel", mostrar);
}

async function init() {
  try {
    configAtual = await carregarConfigUsuario();
  } catch (e) {
    console.warn("Erro ao carregar configurações. Mantendo cache local.", e);
  }

  try {
    await carregarDados();
    await carregarViagens();
    render();
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}
