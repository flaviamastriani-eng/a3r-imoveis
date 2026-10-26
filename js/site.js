/* =====================================================================
   A3R Imóveis — funcionamento do site.
   Você NÃO precisa mexer aqui: o conteúdo fica em dados/imoveis.json e
   dados/site.json, que são editados pelo painel (Pages CMS).
   ===================================================================== */

const TIPOS = {
  Casa: { plural: "Casas", pagina: "casas.html" },
  Apartamento: { plural: "Apartamentos", pagina: "apartamentos.html" },
  Terreno: { plural: "Terrenos", pagina: "terrenos.html" }
};

const ICONES = {
  area: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  quarto: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V6h4v3M3 18v2M21 18v2"/>',
  banheiro: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0M8 19l-1 2M16 19l1 2"/>',
  vaga: '<path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v2M19 16v2M8 13h.01M16 13h.01M5 11h14"/>',
  medida: '<path d="M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/>',
  local: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  whats: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
  compartilhar: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
  seta: '<path d="m9 6 6 6-6 6"/>',
  voltar: '<path d="m15 6-6 6 6 6"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
};

function icone(nome) {
  return `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
}

function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function paragrafos(texto) {
  return String(texto || "")
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function preco(valor) {
  const n = Number(valor);
  if (!n) return "Consulte";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function numero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function plural(n, um, varios) {
  return `${n} ${Number(n) === 1 ? um : varios}`;
}

function slug(texto) {
  return String(texto || "imovel")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "imovel";
}

// O painel salva fotos como "/imagens/anuncios/x.jpg". Tirar a barra inicial
// faz o caminho funcionar tanto no domínio próprio quanto no endereço do GitHub.
function caminhoFoto(caminho) {
  return String(caminho || "").replace(/^\/+/, "");
}

async function carregarJSON(caminho) {
  const resposta = await fetch(caminho, { cache: "no-cache" });
  if (!resposta.ok) throw new Error(`Não foi possível ler ${caminho}`);
  return resposta.json();
}

async function carregarDados() {
  const [site, lista] = await Promise.all([carregarJSON("dados/site.json"), carregarJSON("dados/imoveis.json")]);
  const usados = {};
  const imoveis = (Array.isArray(lista) ? lista : [])
    .filter((im) => im && im.titulo)
    .map((im) => {
      let id = slug(im.titulo);
      usados[id] = (usados[id] || 0) + 1;
      if (usados[id] > 1) id += "-" + usados[id];
      return { ...im, id, fotos: (im.fotos || []).filter(Boolean).map(caminhoFoto) };
    });
  return { site, imoveis, aVenda: imoveis.filter((im) => im.situacao !== "Vendido") };
}

/* ---------- WhatsApp ---------- */

function numeroWhats(site) {
  let n = String(site.whatsapp || "").replace(/\D/g, "");
  if (n.length <= 11) n = "55" + n;
  return n;
}

function linkWhats(site, mensagem) {
  return `https://wa.me/${numeroWhats(site)}?text=${encodeURIComponent(mensagem || site.mensagem_whatsapp || "")}`;
}

function mensagemAnuncio(imovel) {
  const codigo = referencia(imovel) ? ` (${referencia(imovel)})` : "";
  return `Olá! Vi o anúncio "${imovel.titulo}"${codigo} no site e gostaria de mais informações.\n${location.href}`;
}

function mensagemVender() {
  return "Olá! Tenho um imóvel e gostaria de anunciar com a A3R Imóveis.";
}

/* ---------- Pedaços comuns ---------- */

// Aceita "012", "Ref. 012" ou "ref 012" no painel e sempre mostra "Ref. 012"
function referencia(im) {
  const codigo = String(im.codigo || "").replace(/^\s*ref\.?\s*/i, "").trim();
  return codigo ? `Ref. ${codigo}` : "";
}

function dinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function resumo(im) {
  const itens = [];
  if (im.tipo === "Terreno") {
    if (im.metragem) itens.push(`${numero(im.metragem)} m²`);
    if (im.frente && im.fundo) itens.push(`${numero(im.frente)} x ${numero(im.fundo)} m`);
  } else {
    if (im.quartos) itens.push(plural(im.quartos, "quarto", "quartos"));
    if (im.banheiros) itens.push(plural(im.banheiros, "banheiro", "banheiros"));
    if (im.vagas) itens.push(plural(im.vagas, "vaga", "vagas"));
    if (im.metragem) itens.push(`${numero(im.metragem)} m²`);
  }
  return itens;
}

function cartao(im) {
  const foto = im.fotos[0];
  return `
    <a class="cartao" href="imovel.html?id=${encodeURIComponent(im.id)}">
      <div class="cartao-foto">
        ${foto ? `<img src="${esc(foto)}" alt="${esc(im.titulo)}" loading="lazy">` : `<div class="sem-foto">Foto em breve</div>`}
      </div>
      <div class="cartao-corpo">
        <p class="cartao-preco">${preco(im.preco)}${referencia(im) ? `<span class="cartao-ref">${esc(referencia(im))}</span>` : ""}</p>
        <h3>${esc(im.titulo)}</h3>
        <p class="cartao-info">${[im.bairro, ...resumo(im)].filter(Boolean).map(esc).join(" · ")}</p>
      </div>
    </a>`;
}

function grade(lista, vazio) {
  if (!lista.length) return `<p class="vazio">${vazio}</p>`;
  return `<div class="grade">${lista.map(cartao).join("")}</div>`;
}

function montarRodape(site) {
  const rodape = document.getElementById("rodape");
  if (!rodape) return;
  const contatos = [
    `<a href="${linkWhats(site)}" target="_blank" rel="noopener">${icone("whats")}${esc(site.whatsapp)}</a>`
  ];
  if (site.instagram) {
    const usuario = site.instagram.replace(/^.*instagram\.com\//, "").replace(/[@/]/g, "");
    contatos.push(`<a href="https://instagram.com/${encodeURIComponent(usuario)}" target="_blank" rel="noopener">${icone("instagram")}@${esc(usuario)}</a>`);
  }
  if (site.email) contatos.push(`<a href="mailto:${esc(site.email)}">${icone("email")}${esc(site.email)}</a>`);

  const creci = site.creci ? ` · CRECI ${esc(site.creci)}` : "";

  rodape.innerHTML = `
    <div class="rodape-in">
      <div>
        <img class="rodape-logo" src="imagens/logo-nova/logo-horizontal-branca.svg" alt="A3R Imóveis" loading="lazy">
        <p>Casas, apartamentos e terrenos em ${esc(site.cidade)}.</p>
      </div>
      <div>
        <h2>Contato</h2>
        <div class="rodape-contatos">${contatos.join("")}</div>
      </div>
      <div>
        <h2>Imóveis</h2>
        <nav class="rodape-menu">
          ${Object.values(TIPOS).map((t) => `<a href="${t.pagina}">${t.plural}</a>`).join("")}
          <a href="index.html#quem-somos">Quem somos</a>
        </nav>
      </div>
    </div>
    <p class="rodape-final">A3R Imóveis · ${esc(site.cidade)}${creci} · © ${new Date().getFullYear()}</p>`;
}

function montarFaixa(site) {
  const faixa = document.getElementById("faixa");
  if (!faixa) return;
  faixa.innerHTML = `
    <div class="faixa-in">
      <span>${esc(site.cidade)}</span>
      <a href="${linkWhats(site)}" target="_blank" rel="noopener">${icone("whats")}WhatsApp ${esc(site.whatsapp)}</a>
    </div>`;
}

function montarBotaoWhats(site, mensagem) {
  const botao = document.getElementById("whats-flutuante");
  if (!botao) return;
  botao.href = linkWhats(site, mensagem);
  botao.innerHTML = `${icone("whats")}<span>Fale no WhatsApp</span>`;
}

function erro(alvo, e) {
  console.error(e);
  alvo.innerHTML = `<p class="vazio">Não conseguimos carregar os imóveis agora. Tente recarregar a página ou chame a gente no WhatsApp.</p>`;
}

/* ---------- Página inicial ---------- */

function paginaInicio({ site, aVenda }) {
  document.getElementById("hero-titulo").textContent = site.titulo_inicio;
  document.getElementById("hero-texto").textContent = site.texto_inicio;

  document.getElementById("categorias").innerHTML = Object.entries(TIPOS)
    .map(([tipo, t]) => {
      const qtd = aVenda.filter((im) => im.tipo === tipo).length;
      return `<a class="tipo" href="${t.pagina}">
        <span class="tipo-nome">${t.plural}</span>
        <span class="tipo-qtd">${qtd ? plural(qtd, "à venda", "à venda") : "Em breve"}${icone("seta")}</span>
      </a>`;
    })
    .join("");

  // Destaques primeiro, depois os demais, até 6 na página inicial
  const ordenados = [...aVenda.filter((im) => im.destaque), ...aVenda.filter((im) => !im.destaque)];

  // Foto do topo: a escolhida no painel; se vazia, a capa do primeiro imóvel em destaque
  const fotoTopo = caminhoFoto(site.foto_topo) || ordenados.find((im) => im.fotos.length)?.fotos[0];
  if (fotoTopo) document.getElementById("abertura-foto").style.backgroundImage = `url("${encodeURI(fotoTopo)}")`;
  document.getElementById("destaques-qtd").textContent = aVenda.length ? plural(aVenda.length, "imóvel", "imóveis") : "";
  document.getElementById("destaques").innerHTML = grade(ordenados.slice(0, 6), "Novos imóveis em breve. Chame a gente no WhatsApp para saber das novidades.");

  document.getElementById("quem-somos-titulo").textContent = site.quem_somos_titulo;
  document.getElementById("quem-somos-texto").innerHTML = paragrafos(site.quem_somos);

  // "Quer vender seu imóvel?" — textos do painel, com um padrão enquanto estiverem vazios
  document.getElementById("vender-titulo").textContent = site.vender_titulo || "Quer vender seu imóvel?";
  document.getElementById("vender-texto").textContent = site.vender_texto ||
    "Casa, apartamento ou terreno em Barretos e região. Cuidamos da divulgação, das visitas e da negociação.";
  document.getElementById("vender-whats").href = linkWhats(site, mensagemVender());

  // Os anúncios carregam depois da página; refaz o pulo para "Quem somos" quando o link pede
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

/* ---------- Páginas de Casas / Apartamentos / Terrenos ---------- */

function paginaLista({ aVenda }, tipo) {
  const lista = aVenda.filter((im) => im.tipo === tipo);
  const t = TIPOS[tipo];
  document.getElementById("lista-qtd").textContent = lista.length
    ? `${plural(lista.length, "imóvel disponível", "imóveis disponíveis")}`
    : "";
  document.getElementById("lista").innerHTML = grade(
    lista,
    `No momento não temos ${t.plural.toLowerCase()} à venda. Chame a gente no WhatsApp: novidades chegam sempre!`
  );
}

/* ---------- Página de um anúncio ---------- */

function caracteristicas(im) {
  const rotuloArea = { Casa: "Área construída", Apartamento: "Área útil", Terreno: "Área total" }[im.tipo] || "Metragem";
  const sim = (valor) => (valor ? "Sim" : "");
  const itens = [["Bairro", im.bairro]];
  if (im.metragem) itens.push([rotuloArea, `${numero(im.metragem)} m²`]);
  if (im.tipo === "Casa" && im.area_terreno) itens.push(["Área do terreno", `${numero(im.area_terreno)} m²`]);
  if (im.tipo === "Terreno") {
    if (im.frente && im.fundo) itens.push(["Frente x fundo", `${numero(im.frente)} x ${numero(im.fundo)} m`]);
  } else {
    if (im.quartos) itens.push(["Quartos", im.suites ? `${im.quartos} (${plural(im.suites, "suíte", "suítes")})` : im.quartos]);
    if (im.banheiros) itens.push(["Banheiros", im.banheiros]);
    if (im.vagas) itens.push(["Vagas de garagem", im.vagas]);
  }
  if (im.condominio) itens.push(["Condomínio", `${dinheiro(im.condominio)} por mês`]);
  if (im.iptu) itens.push(["IPTU", `${dinheiro(im.iptu)} por ano`]);
  itens.push(["Aceita financiamento", sim(im.financiamento)], ["Aceita FGTS", sim(im.fgts)]);
  return itens
    .filter(([, valor]) => valor)
    .map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${esc(valor)}</dd></div>`)
    .join("");
}

function galeria(im) {
  if (!im.fotos.length) return `<div class="galeria"><div class="sem-foto sem-foto-grande">Fotos em breve</div></div>`;
  const varias = im.fotos.length > 1;
  return `
    <div class="galeria">
      <div class="galeria-trilho" tabindex="0" aria-label="Fotos do imóvel">
        ${im.fotos.map((f, i) => `<button class="galeria-item" data-indice="${i}" aria-label="Ampliar foto ${i + 1}"><img src="${esc(f)}" alt="${esc(im.titulo)} – foto ${i + 1}" ${i ? 'loading="lazy"' : ""}></button>`).join("")}
      </div>
      ${varias ? `
        <button class="galeria-seta galeria-anterior" aria-label="Foto anterior">${icone("voltar")}</button>
        <button class="galeria-seta galeria-proxima" aria-label="Próxima foto">${icone("seta")}</button>
        <span class="galeria-contador"><span class="galeria-atual">1</span> / ${im.fotos.length}</span>` : ""}
    </div>
    ${varias ? `<div class="miniaturas">${im.fotos.map((f, i) => `<button data-indice="${i}" aria-label="Ver foto ${i + 1}"${i ? "" : ' class="ativa"'}><img src="${esc(f)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}`;
}

function ativarGaleria(im) {
  const trilho = document.querySelector(".galeria-trilho");
  if (!trilho) return;
  const total = im.fotos.length;
  const atual = () => Math.round(trilho.scrollLeft / trilho.clientWidth);
  const irPara = (i) => trilho.scrollTo({ left: ((i + total) % total) * trilho.clientWidth, behavior: "smooth" });

  document.querySelector(".galeria-anterior")?.addEventListener("click", () => irPara(atual() - 1));
  document.querySelector(".galeria-proxima")?.addEventListener("click", () => irPara(atual() + 1));
  document.querySelectorAll(".miniaturas button").forEach((b) => b.addEventListener("click", () => irPara(Number(b.dataset.indice))));

  trilho.addEventListener("scroll", () => {
    const i = atual();
    const contador = document.querySelector(".galeria-atual");
    if (contador) contador.textContent = i + 1;
    document.querySelectorAll(".miniaturas button").forEach((b, j) => b.classList.toggle("ativa", i === j));
  }, { passive: true });

  // Tela cheia ao tocar na foto
  const tela = document.getElementById("tela-cheia");
  const trilhoTela = tela.querySelector(".tela-trilho");
  trilhoTela.innerHTML = im.fotos.map((f) => `<div class="tela-item"><img src="${esc(f)}" alt=""></div>`).join("");
  const fechar = () => tela.close();
  tela.querySelector(".tela-fechar").addEventListener("click", fechar);
  tela.querySelector(".tela-anterior").addEventListener("click", () => trilhoTela.scrollBy({ left: -trilhoTela.clientWidth, behavior: "smooth" }));
  tela.querySelector(".tela-proxima").addEventListener("click", () => trilhoTela.scrollBy({ left: trilhoTela.clientWidth, behavior: "smooth" }));
  tela.classList.toggle("uma-foto", total < 2);
  trilho.querySelectorAll(".galeria-item").forEach((b) =>
    b.addEventListener("click", () => {
      tela.showModal();
      trilhoTela.scrollLeft = Number(b.dataset.indice) * trilhoTela.clientWidth;
    })
  );
  document.addEventListener("keydown", (e) => {
    if (tela.open) {
      if (e.key === "ArrowRight") trilhoTela.scrollBy({ left: trilhoTela.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft") trilhoTela.scrollBy({ left: -trilhoTela.clientWidth, behavior: "smooth" });
    }
  });
}

function paginaImovel({ site, imoveis, aVenda }) {
  const alvo = document.getElementById("anuncio");
  const id = new URLSearchParams(location.search).get("id");
  const im = imoveis.find((x) => x.id === id);

  if (!im || im.situacao === "Vendido") {
    document.title = "Imóvel indisponível | A3R Imóveis";
    alvo.innerHTML = `
      <div class="indisponivel">
        <h1>${im ? "Este imóvel já foi vendido" : "Anúncio não encontrado"}</h1>
        <p>Mas temos outras opções que podem interessar você.</p>
        <a class="botao" href="index.html">Ver imóveis disponíveis</a>
      </div>`;
    montarBotaoWhats(site);
    return;
  }

  const t = TIPOS[im.tipo] || { plural: "Imóveis", pagina: "index.html" };
  document.title = `${im.titulo} | A3R Imóveis`;
  document.querySelector(`.menu a[href="${t.pagina}"]`)?.classList.add("ativo");
  const whats = linkWhats(site, mensagemAnuncio(im));
  const parecidos = aVenda.filter((x) => x.tipo === im.tipo && x.id !== im.id).slice(0, 3);

  alvo.innerHTML = `
    <nav class="trilha" aria-label="Você está em">
      <a href="index.html">Início</a> ${icone("seta")} <a href="${t.pagina}">${t.plural}</a>
    </nav>
    <div class="anuncio-grade">
      <div class="anuncio-fotos">${galeria(im)}</div>
      <div class="anuncio-info">
        <p class="anuncio-tipo">${[im.tipo, [im.bairro, im.cidade].filter(Boolean).join(", "), referencia(im)].filter(Boolean).map(esc).join(" · ")}</p>
        <h1>${esc(im.titulo)}</h1>
        <p class="anuncio-preco">${preco(im.preco)}</p>
        <dl class="ficha">${caracteristicas(im)}</dl>
        <div class="anuncio-acoes">
          <a class="botao botao-whats" href="${whats}" target="_blank" rel="noopener">${icone("whats")}Quero mais informações</a>
          <button class="botao botao-contorno" id="compartilhar">${icone("compartilhar")}Compartilhar</button>
        </div>
      </div>
    </div>
    <section class="anuncio-descricao">
      <h2>Sobre este imóvel</h2>
      ${paragrafos(im.descricao) || "<p>Chame a gente no WhatsApp para saber mais detalhes.</p>"}
    </section>
    ${parecidos.length ? `<section class="parecidos"><h2>Outros ${t.plural.toLowerCase()}</h2>${grade(parecidos, "")}</section>` : ""}
    <div class="barra-fixa">
      <div><span>Valor</span><strong>${preco(im.preco)}</strong></div>
      <a class="botao botao-whats" href="${whats}" target="_blank" rel="noopener">${icone("whats")}WhatsApp</a>
    </div>`;

  document.getElementById("compartilhar").addEventListener("click", async (e) => {
    const botao = e.currentTarget;
    const dados = { title: im.titulo, text: `${im.titulo} – A3R Imóveis`, url: location.href };
    if (navigator.share) {
      try { await navigator.share(dados); } catch (_) { /* cancelado */ }
    } else {
      await navigator.clipboard?.writeText(location.href);
      botao.lastChild.textContent = "Link copiado!";
    }
  });

  ativarGaleria(im);
  montarBotaoWhats(site, mensagemAnuncio(im));
}

/* ---------- Início ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  const pagina = document.body.dataset.pagina;
  const principal = document.querySelector("main");
  try {
    const dados = await carregarDados();
    montarFaixa(dados.site);
    montarRodape(dados.site);
    if (pagina === "inicio") paginaInicio(dados);
    if (pagina === "lista") paginaLista(dados, document.body.dataset.tipo);
    if (pagina === "imovel") paginaImovel(dados);
    if (pagina !== "imovel") montarBotaoWhats(dados.site);
  } catch (e) {
    erro(principal, e);
  }
});
