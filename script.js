const nomeUsuario = "VINICIUS MATHEUS";
const inicio = new Date(2026, 2, 11);

let dataAtual = new Date();

const mesesNome = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

document.getElementById("pdfInput").addEventListener("change", async (e) => {
  const files = e.target.files;
  for (let file of files) {
    const texto = await extrairTextoPDF(file);
    await processarTexto(texto);
  }
  
  await carregarDados();
  render();
});
function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    document.querySelector(".btn-google").style.display = "none";
    // Só carrega dados depois de logar
    init();
  } else {
    login();
  }
});


firebase.auth().onAuthStateChanged(user => {

  if (user) {
  }
});

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
    String(date.getMonth()+1).padStart(2,"0") + "-" +
    String(date.getDate()).padStart(2,"0");
}

function processarTexto(texto) {
  const ano = new Date().getFullYear();

  const dataMatch = texto.match(/\d{1,2}\/\d{1,2}/);
  if (!dataMatch) return;

  const [dia, mes] = dataMatch[0].split("/");
  const dateObj = criarDataLocal(ano, Number(mes), Number(dia));
  const data = formatKey(dateObj);

  const indexNome = texto.indexOf(nomeUsuario);

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

  /* 🔥 MONITOR (SEU MÉTODO ORIGINAL CORRETO) */
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

  if (local === "BAS") d.setMinutes(d.getMinutes() - 70);
  if (local === "EGO") d.setMinutes(d.getMinutes() - 100);

  return d.toTimeString().slice(0,5);
}

function calcularArrumar(sairCasa) {
  if (sairCasa === "-") return "-";

  let [h, m] = sairCasa.split(":").map(Number);
  let d = new Date();
  d.setHours(h, m - 60);

  return d.toTimeString().slice(0,5);
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

  const dias = new Date(ano, mes+1, 0).getDate();
  const hoje = formatKey(new Date());

  let dados = JSON.parse(localStorage.getItem("escala")) || [];
  
const primeiroDia = new Date(ano, mes, 1).getDay();

for (let i = 0; i < primeiroDia; i++) {
  const vazio = document.createElement("div");
  vazio.className = "empty-day"; // opcional
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
      <div class="day-num">${i}</div>
      ${registro ? `<div class="dot"></div>` : ""}
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
  lista.innerHTML = "";

  let dados = JSON.parse(localStorage.getItem("escala") || "[]");

  dados.sort((a,b)=> new Date(a.data) - new Date(b.data));

  const hoje = formatKey(new Date());

  const agrupado = {};

  dados.forEach(d => {
    const date = criarDataLocal(
      d.data.slice(0,4),
      d.data.slice(5,7),
      d.data.slice(8,10)
    );

    const ano = date.getFullYear();
    const mes = date.getMonth();

    if (!agrupado[ano]) agrupado[ano] = {};
    if (!agrupado[ano][mes]) agrupado[ano][mes] = [];

    agrupado[ano][mes].push(d);
  });

  Object.keys(agrupado).forEach(ano => {

    const anoHeader = document.createElement("div");
    anoHeader.className = "ano-header";
    anoHeader.innerText = ano;

    lista.appendChild(anoHeader);

    Object.keys(agrupado[ano]).forEach(mes => {

      const mesId = `mes-${ano}-${mes}`;

      const mesHeader = document.createElement("div");
      mesHeader.className = "mes-header";
      mesHeader.innerText = `${mesesNome[mes]} de ${ano}`;
      mesHeader.onclick = () => toggleMes(mesId);

      const conteudo = document.createElement("div");
      conteudo.className = "mes-conteudo";
      conteudo.id = mesId;

      if (ano == new Date().getFullYear() && mes == new Date().getMonth()) {
        conteudo.classList.add("ativo");
      }

      agrupado[ano][mes].forEach(d => {

        const div = document.createElement("div");
        div.className = "card";
        div.id = "dia-" + d.data;

        if (d.data === hoje) div.classList.add("today");

        if (d.status === "FOLGA") {
          div.innerHTML = `
            <div class="card-data">${formatarData(d.data)}</div>
            <div class="card-linha folga">Folga</div>
          `;
        } else {
          div.innerHTML = `
            <div class="card-data">${formatarData(d.data)}</div>
            <div class="card-linha">Entrada: ${d.entrada}</div>
            <div class="card-linha">Saída: ${d.saida}</div>
            <div class="card-linha">Local: ${d.local}</div>
            <div class="card-linha">Monitor: ${d.monitor}</div>
            <div class="card-linha">Sair: ${d.sairCasa}</div>
            <div class="card-linha">Arrumar: ${d.arrumar}</div>
          `;
        }

        conteudo.appendChild(div);
      });

      lista.appendChild(mesHeader);
      lista.appendChild(conteudo);
    });
  });
}

function toggleMes(id) {
  document.getElementById(id).classList.toggle("ativo");
}

function formatarData(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function irParaHoje() {
  const hoje = new Date();
  const key = formatKey(hoje);

  document.querySelectorAll(".mes-conteudo")
    .forEach(el => el.classList.remove("ativo"));

  const mesAtualId = `mes-${hoje.getFullYear()}-${hoje.getMonth()}`;
  const mesAtual = document.getElementById(mesAtualId);

  if (mesAtual) {
    mesAtual.classList.add("ativo");

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

  // fecha todos os meses
  document.querySelectorAll(".mes-conteudo")
    .forEach(el => el.classList.remove("ativo"));

  const mesId = `mes-${ano}-${Number(mes) - 1}`;
  const mesEl = document.getElementById(mesId);

  if (mesEl) {
    mesEl.classList.add("ativo");

    setTimeout(() => {
      const el = document.getElementById("dia-" + dataStr);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        // espera o scroll terminar
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

async function init() {
  try {
    await carregarDados();
    render();
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}