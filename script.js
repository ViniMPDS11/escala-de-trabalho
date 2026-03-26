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

const pdfInput = document.getElementById("pdfInput");
const uploadHint = document.getElementById("uploadHint");

const settingsModal = document.getElementById("settingsModal");
const openSettingsBtn = document.getElementById("openSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const saveSettingsBtn = document.getElementById("saveSettings");
const logoutGoogleBtn = document.getElementById("logoutGoogle");
const applyRetroactiveInput = document.getElementById("applyRetroactive");

const egoHoursInput = document.getElementById("egoHours");
const egoMinutesInput = document.getElementById("egoMinutes");
const basHoursInput = document.getElementById("basHours");
const basMinutesInput = document.getElementById("basMinutes");
const arrumarHoursInput = document.getElementById("arrumarHours");
const arrumarMinutesInput = document.getElementById("arrumarMinutes");
const nomeUsuarioInput = document.getElementById("nomeUsuario");
const nomeAtualConfiguradoSpan = document.getElementById("nomeAtualConfigurado");
const filtroDiasKey = "escalaFiltroOcultarPassados";

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

logoutGoogleBtn.addEventListener("click", async () => {
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

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    usuarioAtual = user;
    document.querySelector(".btn-google").style.display = "none";
    init();
  } else {
    usuarioAtual = null;
    document.querySelector(".btn-google").style.display = "flex";
    limparDadosEscalaLocal();
    render();
  }
});

function limparDadosEscalaLocal() {
  localStorage.setItem("escala", "[]");
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
  renderCalendar();
  renderLista();
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

  const filtroPassadosInput = document.getElementById("ocultarPassados");
  filtroPassadosInput?.addEventListener("change", (event) => {
    localStorage.setItem(filtroDiasKey, event.target.checked ? "1" : "0");
    aplicarFiltroDiasPassadosNoDOM();
  });

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

        if (d.data === hoje) div.classList.add("today");

        if (d.status === "FOLGA") {
          div.innerHTML = `
            <div class="card-topo">
              <div class="card-data">${formatarData(d.data)}</div>
              <div class="card-badge folga">Folga</div>
            </div>
            <div class="card-linha folga">Dia livre para descansar ou planejar a próxima jornada.</div>
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
          `;
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

async function init() {
  try {
    configAtual = await carregarConfigUsuario();
  } catch (e) {
    console.warn("Erro ao carregar configurações. Mantendo cache local.", e);
  }

  try {
    await carregarDados();
    render();
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}
