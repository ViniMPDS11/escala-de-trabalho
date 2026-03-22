const nomeUsuario = "VINICIUS MATHEUS";

document.getElementById("pdfInput").addEventListener("change", async (e) => {
  const files = e.target.files;

  for (let file of files) {
    const texto = await extrairTextoPDF(file);
    processarTexto(texto);
  }

  renderizar();
});

async function extrairTextoPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

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

function processarTexto(texto) {
  const ano = new Date().getFullYear();

  // 📅 pegar data
  const dataMatch = texto.match(/\d{1,2}\/\d{1,2}/);
  if (!dataMatch) return;

  const [dia, mes] = dataMatch[0].split("/");
  const dataFormatada = `${ano}-${mes.padStart(2,"0")}-${dia.padStart(2,"0")}`;

  // 🔎 achar posição do nome
  const indexNome = texto.indexOf(nomeUsuario);

  if (indexNome === -1) {
    salvar({ data: dataFormatada, status: "FOLGA" });
    return;
  }

  // ✂️ cortar trecho da sua linha
  const resto = texto.slice(indexNome);

  const corte = resto.search(/\s\d{2,3}\s[A-Z]{2}\d{3}/);

  const trecho = corte !== -1 ? resto.slice(0, corte) : resto.slice(0, 200);

  // ⏰ horários
  const horas = trecho.match(/\d{1,2}:\d{2}/g) || [];
  const entrada = horas[0] || "-";
  const saida = horas[1] || "-";

  // 📍 local
  let local = trecho.includes("BAS") ? "BAS" :
              trecho.includes("EGO") ? "EGO" : "-";

  // 🏷 monitor FINAL CORRIGIDO
  let monitor = "-";

  const match = trecho.match(/(BAS|EGO)\s+\w+\s+([A-Z\s]+)/);

  if (match) {
    monitor = match[2].trim();

    // corta próxima linha (ex: 136 ...)
    monitor = monitor.split(/\s+\d{2,3}\s/)[0];

    // corta rodapé
    monitor = monitor.split("CONTROLE")[0];

    monitor = monitor.trim();
  }

  let sairCasa = calcularSaidaCasa(entrada, local);
  let arrumar = calcularArrumar(sairCasa);

  salvar({
    data: dataFormatada,
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

  let data = new Date();
  data.setHours(h);
  data.setMinutes(m);

  if (local === "BAS") data.setMinutes(data.getMinutes() - 70);
  if (local === "EGO") data.setMinutes(data.getMinutes() - 100);

  return data.toTimeString().slice(0,5);
}

function calcularArrumar(sairCasa) {
  if (sairCasa === "-") return "-";

  let [h, m] = sairCasa.split(":").map(Number);

  let data = new Date();
  data.setHours(h);
  data.setMinutes(m - 60);

  return data.toTimeString().slice(0,5);
}

function salvar(dado) {
  let dados = JSON.parse(localStorage.getItem("escala")) || [];

  dados = dados.filter(d => d.data !== dado.data);
  dados.push(dado);

  localStorage.setItem("escala", JSON.stringify(dados));
}

function renderizar() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let dados = JSON.parse(localStorage.getItem("escala")) || [];

  dados.sort((a, b) => new Date(a.data) - new Date(b.data));

  const hoje = getHojeLocal();

  dados.forEach(d => {
    let div = document.createElement("div");
    div.classList.add("card");

    if (d.data === hoje) div.classList.add("hoje");
    if (d.status === "FOLGA") div.classList.add("folga");

    div.innerHTML = `
      <div class="card-header">
        <span>${formatarData(d.data)}</span>
        <span class="badge ${d.status === "FOLGA" ? "folga-badge" : "trabalho"}">
          ${d.status}
        </span>
      </div>

      <div class="linha"><span>Entrada</span><span>${d.entrada || "-"}</span></div>
      <div class="linha"><span>Saída</span><span>${d.saida || "-"}</span></div>
      <div class="linha"><span>Local</span><span>${d.local || "-"}</span></div>
      <div class="linha"><span>Monitor</span><span>${d.monitor || "-"}</span></div>
      <div class="linha"><span>🚶 Sair</span><span>${d.sairCasa || "-"}</span></div>
      <div class="linha"><span>⏰ Arrumar</span><span>${d.arrumar || "-"}</span></div>
    `;

    lista.appendChild(div);
  });
}

// 📅 formatação segura (sem bug de fuso)
function formatarData(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

// 📅 hoje correto
function getHojeLocal() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2,"0");
  const mes = String(d.getMonth()+1).padStart(2,"0");
  const ano = d.getFullYear();

  return `${ano}-${mes}-${dia}`;
}

// iniciar
renderizar();