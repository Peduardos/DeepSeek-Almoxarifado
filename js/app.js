/* =========================================================
   Almoxarifado
   Etapa 1: Login mockado
   Etapa 2: Controle de acesso por perfil
   Etapa 3: Dashboard
   Etapa 4: Cadastro de produtos
   Etapa 5: Gerenciamento de produtos
   Etapa 6: Controle de movimentações de estoque
   Etapa 7: Pesquisa, filtragem e ordenação de produtos
   Etapa 8: Controle de estoque mínimo e alertas
   Etapa 9: Histórico de movimentações
   Etapa 10: Persistência local com localStorage
   Etapa 11: Menu de navegação, mensagens globais e responsividade
   Etapa 12: Revisão e integração geral
   ========================================================= */

// -------- Credenciais mockadas --------
const USUARIOS = [
  { usuario: "admin", senha: "admin123", nome: "Administrador", perfil: "ADMIN" },
  { usuario: "comum", senha: "comum123", nome: "Usuário Comum", perfil: "USUARIO_COMUM" }
];

// -------- Permissões por perfil --------
const PERMISSOES = {
  ADMIN: [
    "cadastrar-produto",
    "editar-produto",
    "excluir-produto",
    "registrar-entrada",
    "registrar-saida",
    "consultar-produtos",
    "consultar-estoque",
    "consultar-historico"
  ],
  USUARIO_COMUM: [
    "consultar-produtos",
    "consultar-estoque",
    "consultar-historico"
  ]
};

const PERFIL_LABEL = {
  ADMIN: "ADMIN",
  USUARIO_COMUM: "Usuário Comum"
};

const CATEGORIAS = [
  "Papelaria",
  "Informática",
  "Limpeza",
  "Escritório",
  "Manutenção",
  "Outros"
];

// -------- Chaves de armazenamento local --------
const STORAGE_KEYS = {
  PRODUTOS: "almoxarifado.produtos",
  MOVIMENTACOES: "almoxarifado.movimentacoes",
  CONTADORES: "almoxarifado.contadores",
  FILTROS: "almoxarifado.filtros"
};

// -------- Dados da aplicação --------
let proximoProdutoId = 1;
let produtos = [];

let proximaMovimentacaoId = 1;
let movimentacoes = [];

// -------- Estado dos filtros --------
const filtrosProdutos = {
  nome: "",
  codigo: "",
  categoria: "",
  situacao: "",
  ordenacao: "nome-asc"
};

const filtrosHistorico = {
  produtoId: "",
  tipo: "",
  usuario: "",
  dataInicial: "",
  dataFinal: ""
};

// -------- Elementos do DOM --------
const telaLogin        = document.getElementById("tela-login");
const telaApp          = document.getElementById("tela-app");
const formLogin        = document.getElementById("form-login");
const inputUsuario     = document.getElementById("input-usuario");
const inputSenha       = document.getElementById("input-senha");
const mensagemLogin    = document.getElementById("mensagem-login");
const nomeUsuarioEl    = document.getElementById("nome-usuario");
const perfilUsuarioEl  = document.getElementById("perfil-usuario");
const btnLogout        = document.getElementById("btn-logout");
const btnMenuMobile    = document.getElementById("btn-menu-mobile");
const menuPrincipal    = document.getElementById("menu-principal");
const barraMensagens   = document.getElementById("barra-mensagens");
const painelPersist    = document.getElementById("painel-persistencia");
const btnLimparDados   = document.getElementById("btn-limpar-dados");
const avisoPerfilEl    = document.getElementById("aviso-perfil");
const alertasEstoqueEl = document.getElementById("alertas-estoque");

// Áreas
const areaDashboard    = document.getElementById("area-dashboard");
const areaOperacao     = document.getElementById("area-operacao");
const areaResultadoEl  = document.getElementById("area-resultado");

// Dashboard
const dashTotalProdutos   = document.getElementById("dash-total-produtos");
const dashTotalItens      = document.getElementById("dash-total-itens");
const dashEstoqueBaixo    = document.getElementById("dash-estoque-baixo");
const dashSemEstoque      = document.getElementById("dash-sem-estoque");
const dashMovimentacoesEl = document.getElementById("dash-movimentacoes");
const dashSemMovEl        = document.getElementById("dash-sem-movimentacoes");

// Modal
const modalFundo    = document.getElementById("modal-confirmacao");
const modalTitulo   = document.getElementById("modal-titulo");
const modalMensagem = document.getElementById("modal-mensagem");
const modalCancelar = document.getElementById("modal-cancelar");
const modalConfirmar= document.getElementById("modal-confirmar");

// -------- Sessão atual --------
let usuarioAutenticado = null;
let menuAbertoMobile = false;

// =========================================================
// MENSAGENS GLOBAIS
// =========================================================

function exibirMensagem(tipo, texto, tempoMs) {
  if (!barraMensagens) return;

  const div = document.createElement("div");
  div.className = "msg " + tipo;

  const span = document.createElement("span");
  span.textContent = texto;
  div.appendChild(span);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-fechar-msg";
  btn.textContent = "✕";
  btn.addEventListener("click", () => div.remove());
  div.appendChild(btn);

  barraMensagens.appendChild(div);

  if (typeof tempoMs === "number" && tempoMs > 0) {
    setTimeout(() => { if (div.parentNode) div.remove(); }, tempoMs);
  }
}

// =========================================================
// PERSISTÊNCIA
// =========================================================

function storageDisponivel() {
  try {
    const k = "__almox_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch (e) { return false; }
}

function salvarProdutos() {
  if (!storageDisponivel()) return;
  try { localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(produtos)); }
  catch (e) { console.warn("Falha ao salvar produtos:", e); }
}
function salvarMovimentacoes() {
  if (!storageDisponivel()) return;
  try { localStorage.setItem(STORAGE_KEYS.MOVIMENTACOES, JSON.stringify(movimentacoes)); }
  catch (e) { console.warn("Falha ao salvar movimentações:", e); }
}
function salvarContadores() {
  if (!storageDisponivel()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CONTADORES, JSON.stringify({
      proximoProdutoId: proximoProdutoId,
      proximaMovimentacaoId: proximaMovimentacaoId
    }));
  } catch (e) { console.warn("Falha ao salvar contadores:", e); }
}
function salvarFiltros() {
  if (!storageDisponivel()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.FILTROS, JSON.stringify({
      produtos: filtrosProdutos,
      historico: filtrosHistorico
    }));
  } catch (e) { console.warn("Falha ao salvar filtros:", e); }
}

function lerJson(chave) {
  if (!storageDisponivel()) return null;
  try {
    const raw = localStorage.getItem(chave);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function carregarDados() {
  const produtosSalvos = lerJson(STORAGE_KEYS.PRODUTOS);
  if (Array.isArray(produtosSalvos)) produtos = produtosSalvos;

  const movSalvas = lerJson(STORAGE_KEYS.MOVIMENTACOES);
  if (Array.isArray(movSalvas)) movimentacoes = movSalvas;

  const contadores = lerJson(STORAGE_KEYS.CONTADORES);
  if (contadores && typeof contadores === "object") {
    if (Number.isInteger(contadores.proximoProdutoId)) proximoProdutoId = contadores.proximoProdutoId;
    if (Number.isInteger(contadores.proximaMovimentacaoId)) proximaMovimentacaoId = contadores.proximaMovimentacaoId;
  }

  produtos.forEach((p) => {
    if (typeof p.id === "number" && p.id >= proximoProdutoId) proximoProdutoId = p.id + 1;
  });
  movimentacoes.forEach((m) => {
    if (typeof m.id === "number" && m.id >= proximaMovimentacaoId) proximaMovimentacaoId = m.id + 1;
  });

  const filtrosSalvos = lerJson(STORAGE_KEYS.FILTROS);
  if (filtrosSalvos && typeof filtrosSalvos === "object") {
    if (filtrosSalvos.produtos && typeof filtrosSalvos.produtos === "object") {
      Object.assign(filtrosProdutos, filtrosSalvos.produtos);
    }
    if (filtrosSalvos.historico && typeof filtrosSalvos.historico === "object") {
      Object.assign(filtrosHistorico, filtrosSalvos.historico);
    }
  }
}

function limparDadosPersistidos() {
  if (!storageDisponivel()) return;
  Object.values(STORAGE_KEYS).forEach((k) => {
    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
  });
}

// =========================================================
// AUTENTICAÇÃO / PERMISSÕES
// =========================================================

function autenticar(usuario, senha) {
  return USUARIOS.find((u) => u.usuario === usuario && u.senha === senha) || null;
}

function perfilAtual() {
  return usuarioAutenticado ? usuarioAutenticado.perfil : null;
}

function temPermissao(acao) {
  const perfil = perfilAtual();
  if (!perfil) return false;
  return PERMISSOES[perfil].includes(acao);
}

// =========================================================
// UTILITÁRIOS
// =========================================================

function mostrarTela(tela) {
  document.querySelectorAll(".tela").forEach((el) => el.classList.remove("ativa"));
  tela.classList.add("ativa");
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarDataHora(iso) {
  const d = new Date(iso);
  const dia  = String(d.getDate()).padStart(2, "0");
  const mes  = String(d.getMonth() + 1).padStart(2, "0");
  const ano  = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function buscarProdutoPorId(id) {
  return produtos.find((p) => p.id === id) || null;
}

function buscarProdutoPorCodigo(codigo, ignorarId) {
  return produtos.find(
    (p) =>
      p.codigo.toLowerCase() === String(codigo).toLowerCase() &&
      (ignorarId === undefined || p.id !== ignorarId)
  ) || null;
}

function nomeProduto(id) {
  const p = buscarProdutoPorId(id);
  return p ? p.nome : "—";
}

// =========================================================
// NAVEGAÇÃO
// =========================================================

function fecharMenuMobile() {
  if (menuAbertoMobile) {
    menuPrincipal.classList.remove("aberto");
    menuAbertoMobile = false;
  }
}

function mostrarArea(nomeArea) {
  // Reset das áreas
  document.querySelectorAll(".area-sistema").forEach((a) => a.classList.remove("ativa"));

  // Reset dos itens de menu
  document.querySelectorAll(".menu-item").forEach((b) => b.classList.remove("ativo"));

  if (nomeArea === "dashboard") {
    areaDashboard.classList.add("ativa");
    const itemDash = document.querySelector('.menu-item[data-menu="dashboard"]');
    if (itemDash) itemDash.classList.add("ativo");
    renderizarDashboard();
  } else {
    areaOperacao.classList.add("ativa");
    const item = document.querySelector('.menu-item[data-menu="' + nomeArea + '"]');
    if (item) item.classList.add("ativo");
    tratarAcao(nomeArea);
  }

  fecharMenuMobile();
}

function navegar(menu) {
  if (menu !== "dashboard" && !temPermissao(menu)) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }
  mostrarArea(menu);
}

// =========================================================
// REGISTRO CENTRALIZADO DE MOVIMENTAÇÕES
// =========================================================

function registrarMovimentacao(tipo, produtoId, quantidade) {
  const usuario = usuarioAutenticado;
  movimentacoes.push({
    id: proximaMovimentacaoId++,
    data: new Date().toISOString(),
    tipo: tipo,
    produtoId: produtoId,
    quantidade: quantidade,
    usuarioId: usuario ? usuario.usuario : "—",
    usuarioNome: usuario ? usuario.nome : "—",
    usuarioPerfil: usuario ? usuario.perfil : "—"
  });
}

// =========================================================
// SITUAÇÃO DE ESTOQUE
// =========================================================

function situacaoEstoque(produto) {
  if (produto.quantidade === 0) return { chave: "sem", label: "Sem estoque", classe: "badge-sem" };
  if (produto.quantidade <= produto.estoqueMinimo) return { chave: "baixo", label: "Estoque baixo", classe: "badge-baixo" };
  return { chave: "ok", label: "Em estoque", classe: "badge-ok" };
}

function produtosComEstoqueBaixo() {
  return produtos.filter((p) => situacaoEstoque(p).chave === "baixo");
}
function produtosSemEstoque() {
  return produtos.filter((p) => situacaoEstoque(p).chave === "sem");
}

// =========================================================
// ALERTAS DE ESTOQUE
// =========================================================

function renderizarAlertasEstoque() {
  if (!alertasEstoqueEl) return;
  const baixos = produtosComEstoqueBaixo();
  const sem    = produtosSemEstoque();
  const blocos = [];

  if (sem.length > 0) {
    const itens = sem.map(
      (p) => "<li>" + escaparHtml(p.nome) + " (código " + escaparHtml(p.codigo) + ")</li>"
    ).join("");
    blocos.push(
      '<div class="alerta-estoque sem">' +
        '<span class="alerta-estoque titulo">⚠ Produtos sem estoque (' + sem.length + ')</span>' +
        "<ul>" + itens + "</ul>" +
      "</div>"
    );
  }

  if (baixos.length > 0) {
    const itens = baixos.map(
      (p) => "<li>" + escaparHtml(p.nome) +
        " (código " + escaparHtml(p.codigo) + ") — disponível " +
        p.quantidade + " / mínimo " + p.estoqueMinimo + "</li>"
    ).join("");
    blocos.push(
      '<div class="alerta-estoque baixo">' +
        '<span class="alerta-estoque titulo">⚠ Produtos com estoque baixo (' + baixos.length + ')</span>' +
        "<ul>" + itens + "</ul>" +
      "</div>"
    );
  }

  alertasEstoqueEl.innerHTML = blocos.join("");
}

// =========================================================
// MODAL DE CONFIRMAÇÃO
// =========================================================

let callbackConfirmacao = null;

function abrirConfirmacao(titulo, mensagem, callback) {
  modalTitulo.textContent = titulo;
  modalMensagem.textContent = mensagem;
  callbackConfirmacao = callback;
  modalFundo.style.display = "flex";
}

function fecharConfirmacao() {
  modalFundo.style.display = "none";
  callbackConfirmacao = null;
}

modalCancelar.addEventListener("click", fecharConfirmacao);

modalConfirmar.addEventListener("click", () => {
  const cb = callbackConfirmacao;
  fecharConfirmacao();
  if (typeof cb === "function") cb();
});

// =========================================================
// DASHBOARD
// =========================================================

function calcularResumo() {
  const totalProdutos = produtos.length;
  const totalItens = produtos.reduce((soma, p) => soma + p.quantidade, 0);
  const estoqueBaixo = produtosComEstoqueBaixo().length;
  const semEstoque   = produtosSemEstoque().length;
  return { totalProdutos, totalItens, estoqueBaixo, semEstoque };
}

function movimentacoesRecentes(limite) {
  return [...movimentacoes]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, limite);
}

function renderizarDashboard() {
  const resumo = calcularResumo();
  dashTotalProdutos.textContent = resumo.totalProdutos;
  dashTotalItens.textContent    = resumo.totalItens;
  dashEstoqueBaixo.textContent  = resumo.estoqueBaixo;
  dashSemEstoque.textContent    = resumo.semEstoque;

  renderizarAlertasEstoque();

  const recentes = movimentacoesRecentes(5);
  dashMovimentacoesEl.innerHTML = "";

  if (recentes.length === 0) {
    dashSemMovEl.style.display = "";
    return;
  }
  dashSemMovEl.style.display = "none";

  recentes.forEach((mov) => {
    const tr = document.createElement("tr");
    const tagTipo = mov.tipo === "ENTRADA"
      ? '<span class="tag-entrada">ENTRADA</span>'
      : '<span class="tag-saida">SAÍDA</span>';
    tr.innerHTML =
      "<td>" + formatarDataHora(mov.data) + "</td>" +
      "<td>" + tagTipo + "</td>" +
      "<td>" + escaparHtml(nomeProduto(mov.produtoId)) + "</td>" +
      "<td>" + mov.quantidade + "</td>" +
      "<td>" + escaparHtml(mov.usuarioNome || "—") + "</td>";
    dashMovimentacoesEl.appendChild(tr);
  });
}

// =========================================================
// CONTROLE DE ACESSO NA UI
// =========================================================

function aplicarControleDeAcesso() {
  const perfil = perfilAtual();

  if (perfil === "ADMIN") {
    avisoPerfilEl.textContent =
      "Você está autenticado como ADMIN. Todas as operações estão disponíveis.";
  } else if (perfil === "USUARIO_COMUM") {
    avisoPerfilEl.textContent =
      "Você está autenticado como Usuário Comum. Apenas consultas estão disponíveis.";
  } else {
    avisoPerfilEl.textContent = "";
  }

  document.querySelectorAll('.menu-item[data-acesso="admin"]').forEach((item) => {
    item.style.display = perfil === "ADMIN" ? "" : "none";
  });
}

// =========================================================
// LOGIN / LOGOUT
// =========================================================

function login(event) {
  event.preventDefault();
  mensagemLogin.textContent = "";

  const usuario = inputUsuario.value.trim();
  const senha   = inputSenha.value;

  if (!usuario || !senha) {
    mensagemLogin.textContent = "Preencha usuário e senha.";
    return;
  }

  const encontrado = autenticar(usuario, senha);
  if (!encontrado) {
    mensagemLogin.textContent = "Usuário ou senha incorretos.";
    inputSenha.value = "";
    inputSenha.focus();
    return;
  }

  usuarioAutenticado = encontrado;
  nomeUsuarioEl.textContent   = encontrado.nome;
  perfilUsuarioEl.textContent = PERFIL_LABEL[encontrado.perfil];

  formLogin.reset();
  mostrarTela(telaApp);
  aplicarControleDeAcesso();
  painelPersist.style.display = storageDisponivel() ? "" : "none";

  barraMensagens.innerHTML = "";

  exibirMensagem("sucesso", "Bem-vindo(a), " + encontrado.nome + "!", 3000);

  mostrarArea("dashboard");
}

function logout() {
  usuarioAutenticado = null;
  nomeUsuarioEl.textContent = "";
  perfilUsuarioEl.textContent = "";
  mensagemLogin.textContent = "";
  areaResultadoEl.innerHTML = "";
  alertasEstoqueEl.innerHTML = "";
  barraMensagens.innerHTML = "";
  formLogin.reset();

  document.querySelectorAll('.menu-item[data-acesso="admin"]').forEach((item) => {
    item.style.display = "";
  });

  // Limpa estado de área ativa
  document.querySelectorAll(".area-sistema").forEach((a) => a.classList.remove("ativa"));
  areaDashboard.classList.add("ativa");
  document.querySelectorAll(".menu-item").forEach((b) => b.classList.remove("ativo"));
  fecharMenuMobile();

  mostrarTela(telaLogin);
  inputUsuario.focus();
}

// =========================================================
// CADASTRO DE PRODUTOS
// =========================================================

function renderizarFormularioCadastroProduto() {
  if (!temPermissao("cadastrar-produto")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const optionsCategorias = CATEGORIAS.map(
    (c) => '<option value="' + escaparHtml(c) + '">' + escaparHtml(c) + "</option>"
  ).join("");

  areaResultadoEl.innerHTML = `
    <div class="bloco-formulario">
      <h3>Cadastrar Produto</h3>

      <form id="form-produto" class="form-produto" autocomplete="off" novalidate>
        <div class="campo-form">
          <label for="prod-codigo">Código *</label>
          <input type="text" id="prod-codigo" maxlength="30" />
        </div>
        <div class="campo-form">
          <label for="prod-nome">Nome *</label>
          <input type="text" id="prod-nome" maxlength="80" />
        </div>
        <div class="campo-form">
          <label for="prod-categoria">Categoria *</label>
          <select id="prod-categoria">
            <option value="">Selecione...</option>
            ${optionsCategorias}
          </select>
        </div>
        <div class="campo-form">
          <label for="prod-quantidade">Quantidade inicial *</label>
          <input type="number" id="prod-quantidade" min="0" step="1" value="0" />
        </div>
        <div class="campo-form">
          <label for="prod-estoque-minimo">Estoque mínimo *</label>
          <input type="number" id="prod-estoque-minimo" min="0" step="1" value="0" />
        </div>
        <div class="campo-form">
          <label for="prod-localizacao">Localização *</label>
          <input type="text" id="prod-localizacao" maxlength="60" />
        </div>
        <div class="campo-form campo-largo">
          <label for="prod-descricao">Descrição</label>
          <textarea id="prod-descricao" maxlength="200"></textarea>
        </div>
        <div class="acoes-formulario">
          <button type="submit" class="btn-primario">Salvar Produto</button>
          <button type="button" class="btn-secundario" id="btn-cancelar-produto">Cancelar</button>
        </div>
      </form>

      <div id="feedback-produto"></div>
    </div>
  `;

  document.getElementById("form-produto")
    .addEventListener("submit", submeterFormularioProduto);

  document.getElementById("btn-cancelar-produto")
    .addEventListener("click", () => { mostrarArea("dashboard"); });
}

function validarFormularioProduto(dados, ignorarId) {
  const erros = [];
  if (!dados.codigo) erros.push("O código do produto é obrigatório.");
  else if (buscarProdutoPorCodigo(dados.codigo, ignorarId)) erros.push("Já existe um produto cadastrado com este código.");
  if (!dados.nome) erros.push("O nome do produto é obrigatório.");
  if (!dados.categoria) erros.push("Selecione uma categoria.");
  if (dados.quantidade === null || isNaN(dados.quantidade) || dados.quantidade < 0) erros.push("Informe uma quantidade inicial válida (0 ou maior).");
  if (dados.estoqueMinimo === null || isNaN(dados.estoqueMinimo) || dados.estoqueMinimo < 0) erros.push("Informe um estoque mínimo válido (0 ou maior).");
  if (!dados.localizacao) erros.push("A localização no almoxarifado é obrigatória.");
  return erros;
}

function submeterFormularioProduto(event) {
  event.preventDefault();

  if (!temPermissao("cadastrar-produto")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const codigo       = document.getElementById("prod-codigo").value.trim();
  const nome         = document.getElementById("prod-nome").value.trim();
  const categoria    = document.getElementById("prod-categoria").value;
  const quantidadeStr= document.getElementById("prod-quantidade").value.trim();
  const minimoStr    = document.getElementById("prod-estoque-minimo").value.trim();
  const localizacao  = document.getElementById("prod-localizacao").value.trim();
  const descricao    = document.getElementById("prod-descricao").value.trim();

  const quantidade = quantidadeStr === "" ? null : parseInt(quantidadeStr, 10);
  const estoqueMinimo = minimoStr === "" ? null : parseInt(minimoStr, 10);

  const dados = { codigo, nome, categoria, quantidade, estoqueMinimo, localizacao, descricao };
  const erros = validarFormularioProduto(dados);
  const feedbackEl = document.getElementById("feedback-produto");

  if (erros.length > 0) {
    feedbackEl.innerHTML =
      '<ul class="lista-erros">' +
      erros.map((e) => "<li>" + escaparHtml(e) + "</li>").join("") +
      "</ul>";
    exibirMensagem("erro", "Verifique os campos obrigatórios.", 4000);
    return;
  }

  const novoProduto = {
    id: proximoProdutoId++,
    codigo, nome, descricao, categoria, quantidade, estoqueMinimo, localizacao
  };
  produtos.push(novoProduto);

  if (quantidade > 0) {
    registrarMovimentacao("ENTRADA", novoProduto.id, quantidade);
  }

  salvarProdutos();
  salvarMovimentacoes();
  salvarContadores();

  feedbackEl.innerHTML =
    '<p class="mensagem-sucesso">Produto "' +
    escaparHtml(novoProduto.nome) +
    '" cadastrado com sucesso (código ' +
    escaparHtml(novoProduto.codigo) + ").</p>";

  exibirMensagem("sucesso", 'Produto "' + novoProduto.nome + '" cadastrado com sucesso.', 4000);

  document.getElementById("form-produto").reset();
  document.getElementById("prod-quantidade").value = "0";
  document.getElementById("prod-estoque-minimo").value = "0";
  document.getElementById("prod-codigo").focus();

  renderizarDashboard();
}

// =========================================================
// GERENCIAMENTO DE PRODUTOS
// =========================================================

function aplicarFiltrosOrdenacao(lista) {
  const f = filtrosProdutos;
  let resultado = lista.slice();

  if (f.nome) {
    const alvo = f.nome.toLowerCase();
    resultado = resultado.filter((p) => p.nome.toLowerCase().includes(alvo));
  }
  if (f.codigo) {
    const alvo = f.codigo.toLowerCase();
    resultado = resultado.filter((p) => p.codigo.toLowerCase().includes(alvo));
  }
  if (f.categoria) resultado = resultado.filter((p) => p.categoria === f.categoria);
  if (f.situacao)  resultado = resultado.filter((p) => situacaoEstoque(p).chave === f.situacao);

  switch (f.ordenacao) {
    case "nome-asc":   resultado.sort((a, b) => a.nome.localeCompare(b.nome)); break;
    case "nome-desc":  resultado.sort((a, b) => b.nome.localeCompare(a.nome)); break;
    case "codigo-asc": resultado.sort((a, b) => a.codigo.localeCompare(b.codigo)); break;
    case "codigo-desc":resultado.sort((a, b) => b.codigo.localeCompare(a.codigo)); break;
    case "qtd-asc":    resultado.sort((a, b) => a.quantidade - b.quantidade); break;
    case "qtd-desc":   resultado.sort((a, b) => b.quantidade - a.quantidade); break;
    default:           resultado.sort((a, b) => a.nome.localeCompare(b.nome));
  }
  return resultado;
}

function renderizarListaProdutos() {
  if (!temPermissao("consultar-produtos")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  if (produtos.length === 0) {
    areaResultadoEl.innerHTML = `
      <div class="bloco-formulario">
        <h3>Produtos Cadastrados</h3>
        <p class="texto-vazio">Nenhum produto cadastrado até o momento.</p>
      </div>
    `;
    exibirMensagem("aviso", "Nenhum produto cadastrado até o momento.", 4000);
    return;
  }

  const optionsCategorias = CATEGORIAS.map((c) => {
    const sel = filtrosProdutos.categoria === c ? " selected" : "";
    return '<option value="' + escaparHtml(c) + '"' + sel + ">" + escaparHtml(c) + "</option>";
  }).join("");

  const ordenacoes = [
    { valor: "nome-asc",    label: "Nome (A → Z)" },
    { valor: "nome-desc",   label: "Nome (Z → A)" },
    { valor: "codigo-asc",  label: "Código (crescente)" },
    { valor: "codigo-desc", label: "Código (decrescente)" },
    { valor: "qtd-asc",     label: "Quantidade (menor → maior)" },
    { valor: "qtd-desc",    label: "Quantidade (maior → menor)" }
  ].map((o) => {
    const sel = filtrosProdutos.ordenacao === o.valor ? " selected" : "";
    return '<option value="' + o.valor + '"' + sel + ">" + o.label + "</option>";
  }).join("");

  areaResultadoEl.innerHTML = `
    <div class="bloco-formulario">
      <h3>Produtos Cadastrados</h3>

      <div class="filtros-produtos">
        <div class="campo-form">
          <label for="filtro-nome">Pesquisar por nome</label>
          <input type="text" id="filtro-nome" value="${escaparHtml(filtrosProdutos.nome)}" placeholder="Ex.: caneta" />
        </div>
        <div class="campo-form">
          <label for="filtro-codigo">Pesquisar por código</label>
          <input type="text" id="filtro-codigo" value="${escaparHtml(filtrosProdutos.codigo)}" placeholder="Ex.: 001" />
        </div>
        <div class="campo-form">
          <label for="filtro-categoria">Categoria</label>
          <select id="filtro-categoria">
            <option value="">Todas</option>
            ${optionsCategorias}
          </select>
        </div>
        <div class="campo-form">
          <label for="filtro-situacao">Situação</label>
          <select id="filtro-situacao">
            <option value="">Todas</option>
            <option value="ok"    ${filtrosProdutos.situacao === "ok"    ? "selected" : ""}>Em estoque</option>
            <option value="baixo" ${filtrosProdutos.situacao === "baixo" ? "selected" : ""}>Estoque baixo</option>
            <option value="sem"   ${filtrosProdutos.situacao === "sem"   ? "selected" : ""}>Sem estoque</option>
          </select>
        </div>
        <div class="campo-form">
          <label for="filtro-ordenacao">Ordenação</label>
          <select id="filtro-ordenacao">${ordenacoes}</select>
        </div>
        <div class="filtros-acoes">
          <button type="button" class="btn-secundario" id="btn-limpar-filtros">Limpar Filtros</button>
        </div>
      </div>

      <p class="filtros-resumo" id="filtros-resumo"></p>
      <div id="lista-produtos-container"></div>
      <div id="feedback-lista"></div>
    </div>
  `;

  document.getElementById("filtro-nome").addEventListener("input", (e) => {
    filtrosProdutos.nome = e.target.value; salvarFiltros(); atualizarListaFiltrada();
  });
  document.getElementById("filtro-codigo").addEventListener("input", (e) => {
    filtrosProdutos.codigo = e.target.value; salvarFiltros(); atualizarListaFiltrada();
  });
  document.getElementById("filtro-categoria").addEventListener("change", (e) => {
    filtrosProdutos.categoria = e.target.value; salvarFiltros(); atualizarListaFiltrada();
  });
  document.getElementById("filtro-situacao").addEventListener("change", (e) => {
    filtrosProdutos.situacao = e.target.value; salvarFiltros(); atualizarListaFiltrada();
  });
  document.getElementById("filtro-ordenacao").addEventListener("change", (e) => {
    filtrosProdutos.ordenacao = e.target.value; salvarFiltros(); atualizarListaFiltrada();
  });
  document.getElementById("btn-limpar-filtros").addEventListener("click", () => {
    filtrosProdutos.nome = "";
    filtrosProdutos.codigo = "";
    filtrosProdutos.categoria = "";
    filtrosProdutos.situacao = "";
    filtrosProdutos.ordenacao = "nome-asc";
    salvarFiltros();
    renderizarListaProdutos();
    exibirMensagem("aviso", "Filtros de produtos limpos.", 2500);
  });

  atualizarListaFiltrada();
}

function atualizarListaFiltrada() {
  const container = document.getElementById("lista-produtos-container");
  const resumoEl  = document.getElementById("filtros-resumo");
  if (!container) return;

  const podeEditar  = temPermissao("editar-produto");
  const podeExcluir = temPermissao("excluir-produto");

  const lista = aplicarFiltrosOrdenacao(produtos);
  if (resumoEl) resumoEl.textContent =
    "Exibindo " + lista.length + " de " + produtos.length + " produto(s).";

  if (lista.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhum produto corresponde aos filtros aplicados.</p>';
    return;
  }

  const linhas = lista.map((p) => {
    const sit = situacaoEstoque(p);
    const botoes = [];
    botoes.push('<button type="button" class="btn-mini ver" data-acao-lista="ver" data-id="' + p.id + '">Ver</button>');
    if (podeEditar) botoes.push('<button type="button" class="btn-mini editar" data-acao-lista="editar" data-id="' + p.id + '">Editar</button>');
    if (podeExcluir) botoes.push('<button type="button" class="btn-mini excluir" data-acao-lista="excluir" data-id="' + p.id + '">Excluir</button>');

    return `
      <tr>
        <td>${escaparHtml(p.codigo)}</td>
        <td>${escaparHtml(p.nome)}</td>
        <td>${escaparHtml(p.categoria)}</td>
        <td>${p.quantidade}</td>
        <td>${p.estoqueMinimo}</td>
        <td><span class="badge ${sit.classe}">${sit.label}</span></td>
        <td>${botoes.join("")}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="tabela-scroll">
      <table class="tabela">
        <thead>
          <tr>
            <th>Código</th><th>Nome</th><th>Categoria</th>
            <th>Qtd.</th><th>Est. mín.</th><th>Situação</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll("[data-acao-lista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const acao = btn.getAttribute("data-acao-lista");
      const id = parseInt(btn.getAttribute("data-id"), 10);
      if (acao === "ver")     renderizarDetalheProduto(id);
      if (acao === "editar")  renderizarFormularioEdicaoProduto(id);
      if (acao === "excluir") confirmarExclusaoProduto(id);
    });
  });
}

function renderizarDetalheProduto(id) {
  const p = buscarProdutoPorId(id);
  if (!p) return;
  const sit = situacaoEstoque(p);

  areaResultadoEl.innerHTML = `
    <div class="bloco-formulario">
      <h3>Detalhes do Produto</h3>
      <ul class="detalhe-produto">
        <li><strong>Código:</strong> ${escaparHtml(p.codigo)}</li>
        <li><strong>Nome:</strong> ${escaparHtml(p.nome)}</li>
        <li><strong>Categoria:</strong> ${escaparHtml(p.categoria)}</li>
        <li><strong>Descrição:</strong> ${p.descricao ? escaparHtml(p.descricao) : "—"}</li>
        <li><strong>Quantidade atual:</strong> ${p.quantidade}</li>
        <li><strong>Estoque mínimo:</strong> ${p.estoqueMinimo}</li>
        <li><strong>Localização:</strong> ${escaparHtml(p.localizacao)}</li>
        <li><strong>Situação:</strong> <span class="badge ${sit.classe}">${sit.label}</span></li>
      </ul>
      <div class="acoes-formulario">
        <button type="button" class="btn-secundario" id="btn-voltar-detalhe">Voltar</button>
      </div>
    </div>
  `;

  document.getElementById("btn-voltar-detalhe")
    .addEventListener("click", renderizarListaProdutos);
}

function renderizarFormularioEdicaoProduto(id) {
  if (!temPermissao("editar-produto")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const p = buscarProdutoPorId(id);
  if (!p) return;

  const optionsCategorias = CATEGORIAS.map((c) => {
    const sel = c === p.categoria ? " selected" : "";
    return '<option value="' + escaparHtml(c) + '"' + sel + ">" + escaparHtml(c) + "</option>";
  }).join("");

  areaResultadoEl.innerHTML = `
    <div class="bloco-formulario">
      <h3>Editar Produto</h3>

      <form id="form-edicao-produto" class="form-produto" autocomplete="off" novalidate>
        <div class="campo-form">
          <label for="edit-codigo">Código *</label>
          <input type="text" id="edit-codigo" maxlength="30" value="${escaparHtml(p.codigo)}" />
        </div>
        <div class="campo-form">
          <label for="edit-nome">Nome *</label>
          <input type="text" id="edit-nome" maxlength="80" value="${escaparHtml(p.nome)}" />
        </div>
        <div class="campo-form">
          <label for="edit-categoria">Categoria *</label>
          <select id="edit-categoria">
            <option value="">Selecione...</option>
            ${optionsCategorias}
          </select>
        </div>
        <div class="campo-form">
          <label for="edit-quantidade">Quantidade atual *</label>
          <input type="number" id="edit-quantidade" min="0" step="1" value="${p.quantidade}" />
        </div>
        <div class="campo-form">
          <label for="edit-estoque-minimo">Estoque mínimo *</label>
          <input type="number" id="edit-estoque-minimo" min="0" step="1" value="${p.estoqueMinimo}" />
        </div>
        <div class="campo-form">
          <label for="edit-localizacao">Localização *</label>
          <input type="text" id="edit-localizacao" maxlength="60" value="${escaparHtml(p.localizacao)}" />
        </div>
        <div class="campo-form campo-largo">
          <label for="edit-descricao">Descrição</label>
          <textarea id="edit-descricao" maxlength="200">${escaparHtml(p.descricao || "")}</textarea>
        </div>
        <div class="acoes-formulario">
          <button type="submit" class="btn-primario">Salvar Alterações</button>
          <button type="button" class="btn-secundario" id="btn-cancelar-edicao">Cancelar</button>
        </div>
      </form>

      <div id="feedback-edicao"></div>
    </div>
  `;

  document.getElementById("form-edicao-produto")
    .addEventListener("submit", (ev) => submeterFormularioEdicaoProduto(ev, id));
  document.getElementById("btn-cancelar-edicao")
    .addEventListener("click", renderizarListaProdutos);
}

function submeterFormularioEdicaoProduto(event, id) {
  event.preventDefault();

  if (!temPermissao("editar-produto")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const p = buscarProdutoPorId(id);
  if (!p) return;

  const codigo       = document.getElementById("edit-codigo").value.trim();
  const nome         = document.getElementById("edit-nome").value.trim();
  const categoria    = document.getElementById("edit-categoria").value;
  const quantidadeStr= document.getElementById("edit-quantidade").value.trim();
  const minimoStr    = document.getElementById("edit-estoque-minimo").value.trim();
  const localizacao  = document.getElementById("edit-localizacao").value.trim();
  const descricao    = document.getElementById("edit-descricao").value.trim();

  const quantidade    = quantidadeStr === "" ? null : parseInt(quantidadeStr, 10);
  const estoqueMinimo = minimoStr === "" ? null : parseInt(minimoStr, 10);

  const dados = { codigo, nome, categoria, quantidade, estoqueMinimo, localizacao, descricao };
  const erros = validarFormularioProduto(dados, id);
  const feedbackEl = document.getElementById("feedback-edicao");

  if (erros.length > 0) {
    feedbackEl.innerHTML = '<ul class="lista-erros">' +
      erros.map((e) => "<li>" + escaparHtml(e) + "</li>").join("") + "</ul>";
    exibirMensagem("erro", "Verifique os campos obrigatórios.", 4000);
    return;
  }

  const quantidadeAnterior = p.quantidade;
  const diferenca = quantidade - quantidadeAnterior;

  p.codigo = codigo; p.nome = nome; p.categoria = categoria;
  p.quantidade = quantidade; p.estoqueMinimo = estoqueMinimo;
  p.localizacao = localizacao; p.descricao = descricao;

  if (diferenca !== 0) {
    registrarMovimentacao(diferenca > 0 ? "ENTRADA" : "SAIDA", p.id, Math.abs(diferenca));
  }

  salvarProdutos(); salvarMovimentacoes(); salvarContadores();

  renderizarDashboard();
  renderizarListaProdutos();

  const feedbackLista = document.getElementById("feedback-lista");
  if (feedbackLista) {
    feedbackLista.innerHTML =
      '<p class="mensagem-sucesso">Produto "' + escaparHtml(p.nome) + '" atualizado com sucesso.</p>';
  }
  exibirMensagem("sucesso", 'Produto "' + p.nome + '" atualizado com sucesso.', 4000);
}

function confirmarExclusaoProduto(id) {
  if (!temPermissao("excluir-produto")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const p = buscarProdutoPorId(id);
  if (!p) return;

  abrirConfirmacao(
    "Excluir Produto",
    'Tem certeza que deseja excluir o produto "' + p.nome + '" (código ' + p.codigo + ")?",
    () => excluirProduto(id)
  );
}

function excluirProduto(id) {
  if (!temPermissao("excluir-produto")) return;

  const idx = produtos.findIndex((p) => p.id === id);
  if (idx === -1) return;

  const nome = produtos[idx].nome;
  produtos.splice(idx, 1);

  salvarProdutos(); salvarContadores();

  renderizarDashboard();
  renderizarListaProdutos();

  const feedbackLista = document.getElementById("feedback-lista");
  if (feedbackLista) {
    feedbackLista.innerHTML =
      '<p class="mensagem-sucesso">Produto "' + escaparHtml(nome) + '" excluído com sucesso.</p>';
  }
  exibirMensagem("sucesso", 'Produto "' + nome + '" excluído com sucesso.', 4000);
}

// =========================================================
// MOVIMENTAÇÕES DE ESTOQUE
// =========================================================

function renderizarFormularioMovimentacao(tipo) {
  const acao = tipo === "ENTRADA" ? "registrar-entrada" : "registrar-saida";
  if (!temPermissao(acao)) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const titulo = tipo === "ENTRADA" ? "Registrar Entrada" : "Registrar Saída";

  if (produtos.length === 0) {
    areaResultadoEl.innerHTML = `
      <div class="bloco-formulario">
        <h3>${titulo}</h3>
        <p class="texto-vazio">Nenhum produto cadastrado. Cadastre um produto antes de registrar movimentações.</p>
        <div class="acoes-formulario">
          <button type="button" class="btn-secundario" id="btn-voltar-mov">Voltar</button>
        </div>
      </div>
    `;
    exibirMensagem("aviso", "Cadastre um produto antes de registrar movimentações.", 4000);
    document.getElementById("btn-voltar-mov")
      .addEventListener("click", () => mostrarArea("dashboard"));
    return;
  }

  const optionsProdutos = produtos.map(
    (p) => '<option value="' + p.id + '">' +
      escaparHtml(p.codigo) + " — " + escaparHtml(p.nome) +
      " (disp.: " + p.quantidade + ")</option>"
  ).join("");

  areaResultadoEl.innerHTML = `
    <div class="bloco-formulario">
      <h3>${titulo}</h3>

      <form id="form-movimentacao" class="form-produto" autocomplete="off" novalidate>
        <div class="campo-form campo-largo">
          <label for="mov-produto">Produto *</label>
          <select id="mov-produto">
            <option value="">Selecione um produto...</option>
            ${optionsProdutos}
          </select>
        </div>
        <div class="campo-form">
          <label for="mov-quantidade">Quantidade *</label>
          <input type="number" id="mov-quantidade" min="1" step="1" value="1" />
        </div>
        <div class="campo-form campo-largo">
          <div class="info-produto-mov" id="mov-info-produto">
            Selecione um produto para visualizar a quantidade disponível.
          </div>
        </div>
        <div class="acoes-formulario">
          <button type="submit" class="btn-primario">Confirmar ${tipo === "ENTRADA" ? "Entrada" : "Saída"}</button>
          <button type="button" class="btn-secundario" id="btn-cancelar-mov">Cancelar</button>
        </div>
      </form>

      <div id="feedback-mov"></div>
    </div>
  `;

  const selectProduto = document.getElementById("mov-produto");
  const infoProduto   = document.getElementById("mov-info-produto");

  function atualizarInfo() {
    const id = parseInt(selectProduto.value, 10);
    const p = buscarProdutoPorId(id);
    if (!p) {
      infoProduto.textContent = "Selecione um produto para visualizar a quantidade disponível.";
      return;
    }
    const sit = situacaoEstoque(p);
    infoProduto.innerHTML =
      "Quantidade disponível: <strong>" + p.quantidade + "</strong> " +
      '— <span class="badge ' + sit.classe + '">' + sit.label + "</span>";
  }

  selectProduto.addEventListener("change", atualizarInfo);
  atualizarInfo();

  document.getElementById("form-movimentacao")
    .addEventListener("submit", (ev) => submeterFormularioMovimentacao(ev, tipo));
  document.getElementById("btn-cancelar-mov")
    .addEventListener("click", () => mostrarArea("dashboard"));
}

function submeterFormularioMovimentacao(event, tipo) {
  event.preventDefault();

  const acao = tipo === "ENTRADA" ? "registrar-entrada" : "registrar-saida";
  if (!temPermissao(acao)) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const feedbackEl    = document.getElementById("feedback-mov");
  const selectProduto = document.getElementById("mov-produto");
  const inputQtd      = document.getElementById("mov-quantidade");

  const produtoId     = parseInt(selectProduto.value, 10);
  const quantidadeStr = inputQtd.value.trim();
  const quantidade    = quantidadeStr === "" ? null : parseInt(quantidadeStr, 10);

  const erros = [];
  const produto = buscarProdutoPorId(produtoId);
  if (!produto) erros.push("Selecione um produto válido.");
  if (quantidade === null || isNaN(quantidade) || quantidade <= 0) erros.push("Informe uma quantidade maior que zero.");
  if (produto && tipo === "SAIDA" && quantidade !== null && !isNaN(quantidade)) {
    if (quantidade > produto.quantidade) {
      erros.push("Quantidade de saída (" + quantidade + ") superior à disponível em estoque (" + produto.quantidade + ").");
    }
  }

  if (erros.length > 0) {
    feedbackEl.innerHTML = '<ul class="lista-erros">' +
      erros.map((e) => "<li>" + escaparHtml(e) + "</li>").join("") + "</ul>";
    exibirMensagem("erro", "Não foi possível registrar a movimentação.", 4000);
    return;
  }

  if (tipo === "ENTRADA") produto.quantidade += quantidade;
  else                    produto.quantidade -= quantidade;

  registrarMovimentacao(tipo, produto.id, quantidade);

  salvarProdutos(); salvarMovimentacoes(); salvarContadores();

  const rotulo = tipo === "ENTRADA" ? "Entrada" : "Saída";
  const sit = situacaoEstoque(produto);

  feedbackEl.innerHTML =
    '<p class="mensagem-sucesso">' + rotulo + " de " + quantidade +
    ' unidade(s) registrada(s) para "' + escaparHtml(produto.nome) +
    '". Quantidade atual: ' + produto.quantidade +
    ' — <span class="badge ' + sit.classe + '">' + sit.label + "</span></p>";

  const infoProduto = document.getElementById("mov-info-produto");
  infoProduto.innerHTML =
    "Quantidade disponível: <strong>" + produto.quantidade + "</strong> " +
    '— <span class="badge ' + sit.classe + '">' + sit.label + "</span>";

  const opt = selectProduto.querySelector('option[value="' + produto.id + '"]');
  if (opt) opt.textContent =
    produto.codigo + " — " + produto.nome + " (disp.: " + produto.quantidade + ")";

  inputQtd.value = "1";

  exibirMensagem("sucesso",
    rotulo + " de " + quantidade + " unidade(s) de " + produto.nome + " registrada.", 4000);

  renderizarDashboard();
}

// =========================================================
// HISTÓRICO DE MOVIMENTAÇÕES
// =========================================================

function aplicarFiltrosHistorico() {
  const f = filtrosHistorico;
  let resultado = [...movimentacoes];

  if (f.produtoId) {
    const id = parseInt(f.produtoId, 10);
    resultado = resultado.filter((m) => m.produtoId === id);
  }
  if (f.tipo) resultado = resultado.filter((m) => m.tipo === f.tipo);
  if (f.usuario) {
    const alvo = f.usuario.toLowerCase();
    resultado = resultado.filter((m) => {
      const nome = (m.usuarioNome || "").toLowerCase();
      const login = (m.usuarioId || "").toLowerCase();
      return nome.includes(alvo) || login.includes(alvo);
    });
  }
  if (f.dataInicial) {
    const inicio = new Date(f.dataInicial + "T00:00:00");
    resultado = resultado.filter((m) => new Date(m.data) >= inicio);
  }
  if (f.dataFinal) {
    const fim = new Date(f.dataFinal + "T23:59:59");
    resultado = resultado.filter((m) => new Date(m.data) <= fim);
  }

  resultado.sort((a, b) => new Date(b.data) - new Date(a.data));
  return resultado;
}

function renderizarHistorico() {
  if (!temPermissao("consultar-historico")) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  const optionsProdutos = produtos.map((p) => {
    const sel = String(filtrosHistorico.produtoId) === String(p.id) ? " selected" : "";
    return '<option value="' + p.id + '"' + sel + ">" +
      escaparHtml(p.codigo) + " — " + escaparHtml(p.nome) + "</option>";
  }).join("");

  areaResultadoEl.innerHTML = `
    <div class="bloco-formulario">
      <h3>Histórico de Movimentações</h3>

      <div class="filtros-historico">
        <div class="campo-form">
          <label for="hist-produto">Produto</label>
          <select id="hist-produto"><option value="">Todos</option>${optionsProdutos}</select>
        </div>
        <div class="campo-form">
          <label for="hist-tipo">Tipo</label>
          <select id="hist-tipo">
            <option value="">Todos</option>
            <option value="ENTRADA" ${filtrosHistorico.tipo === "ENTRADA" ? "selected" : ""}>Entrada</option>
            <option value="SAIDA"   ${filtrosHistorico.tipo === "SAIDA"   ? "selected" : ""}>Saída</option>
          </select>
        </div>
        <div class="campo-form">
          <label for="hist-usuario">Usuário</label>
          <input type="text" id="hist-usuario" placeholder="Nome ou login"
                 value="${escaparHtml(filtrosHistorico.usuario)}" />
        </div>
        <div class="campo-form">
          <label for="hist-data-inicial">Data inicial</label>
          <input type="date" id="hist-data-inicial" value="${escaparHtml(filtrosHistorico.dataInicial)}" />
        </div>
        <div class="campo-form">
          <label for="hist-data-final">Data final</label>
          <input type="date" id="hist-data-final" value="${escaparHtml(filtrosHistorico.dataFinal)}" />
        </div>
        <div class="filtros-acoes">
          <button type="button" class="btn-secundario" id="btn-limpar-hist">Limpar Filtros</button>
        </div>
      </div>

      <p class="filtros-resumo" id="hist-resumo"></p>
      <div id="hist-container"></div>
    </div>
  `;

  document.getElementById("hist-produto").addEventListener("change", (e) => {
    filtrosHistorico.produtoId = e.target.value; salvarFiltros(); atualizarTabelaHistorico();
  });
  document.getElementById("hist-tipo").addEventListener("change", (e) => {
    filtrosHistorico.tipo = e.target.value; salvarFiltros(); atualizarTabelaHistorico();
  });
  document.getElementById("hist-usuario").addEventListener("input", (e) => {
    filtrosHistorico.usuario = e.target.value; salvarFiltros(); atualizarTabelaHistorico();
  });
  document.getElementById("hist-data-inicial").addEventListener("change", (e) => {
    filtrosHistorico.dataInicial = e.target.value; salvarFiltros(); atualizarTabelaHistorico();
  });
  document.getElementById("hist-data-final").addEventListener("change", (e) => {
    filtrosHistorico.dataFinal = e.target.value; salvarFiltros(); atualizarTabelaHistorico();
  });
  document.getElementById("btn-limpar-hist").addEventListener("click", () => {
    filtrosHistorico.produtoId = "";
    filtrosHistorico.tipo = "";
    filtrosHistorico.usuario = "";
    filtrosHistorico.dataInicial = "";
    filtrosHistorico.dataFinal = "";
    salvarFiltros();
    renderizarHistorico();
    exibirMensagem("aviso", "Filtros do histórico limpos.", 2500);
  });

  atualizarTabelaHistorico();
}

function atualizarTabelaHistorico() {
  const container = document.getElementById("hist-container");
  const resumoEl  = document.getElementById("hist-resumo");
  if (!container) return;

  const lista = aplicarFiltrosHistorico();
  if (resumoEl) resumoEl.textContent =
    "Exibindo " + lista.length + " de " + movimentacoes.length + " movimentação(ões).";

  if (lista.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhuma movimentação corresponde aos filtros aplicados.</p>';
    return;
  }

  const linhas = lista.map((m) => {
    const tagTipo = m.tipo === "ENTRADA"
      ? '<span class="tag-entrada">ENTRADA</span>'
      : '<span class="tag-saida">SAÍDA</span>';
    return `
      <tr>
        <td>${formatarDataHora(m.data)}</td>
        <td>${escaparHtml(nomeProduto(m.produtoId))}</td>
        <td>${tagTipo}</td>
        <td>${m.quantidade}</td>
        <td>${escaparHtml(m.usuarioNome || "—")}</td>
        <td>${escaparHtml(PERFIL_LABEL[m.usuarioPerfil] || m.usuarioPerfil || "—")}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="tabela-scroll">
      <table class="tabela">
        <thead>
          <tr>
            <th>Data/Hora</th><th>Produto</th><th>Tipo</th>
            <th>Qtd.</th><th>Usuário</th><th>Perfil</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

// =========================================================
// HANDLER GENÉRICO DAS AÇÕES
// =========================================================

function tratarAcao(acao) {
  if (!temPermissao(acao)) {
    exibirMensagem("erro", "Ação não permitida para o seu perfil.", 4000);
    return;
  }

  switch (acao) {
    case "cadastrar-produto":   renderizarFormularioCadastroProduto(); return;
    case "consultar-produtos":
    case "editar-produto":
    case "excluir-produto":     renderizarListaProdutos(); return;
    case "registrar-entrada":   renderizarFormularioMovimentacao("ENTRADA"); return;
    case "registrar-saida":     renderizarFormularioMovimentacao("SAIDA"); return;
    case "consultar-historico": renderizarHistorico(); return;
    default:
      areaResultadoEl.innerHTML =
        '<p>Ação selecionada: <strong>' + escaparHtml(acao) + "</strong>.</p>";
  }
}

// =========================================================
// EVENTOS
// =========================================================

formLogin.addEventListener("submit", login);
btnLogout.addEventListener("click", logout);

menuPrincipal.addEventListener("click", (event) => {
  const item = event.target.closest(".menu-item");
  if (!item) return;
  const menu = item.getAttribute("data-menu");
  navegar(menu);
});

btnMenuMobile.addEventListener("click", () => {
  menuAbertoMobile = !menuAbertoMobile;
  menuPrincipal.classList.toggle("aberto", menuAbertoMobile);
});

btnLimparDados.addEventListener("click", () => {
  abrirConfirmacao(
    "Limpar dados locais",
    "Todos os produtos e movimentações salvos neste navegador serão removidos. Deseja continuar?",
    () => {
      limparDadosPersistidos();

      produtos = [];
      movimentacoes = [];
      proximoProdutoId = 1;
      proximaMovimentacaoId = 1;

      filtrosProdutos.nome = "";
      filtrosProdutos.codigo = "";
      filtrosProdutos.categoria = "";
      filtrosProdutos.situacao = "";
      filtrosProdutos.ordenacao = "nome-asc";

      filtrosHistorico.produtoId = "";
      filtrosHistorico.tipo = "";
      filtrosHistorico.usuario = "";
      filtrosHistorico.dataInicial = "";
      filtrosHistorico.dataFinal = "";

      renderizarDashboard();
      mostrarArea("dashboard");
      exibirMensagem("sucesso", "Dados locais removidos com sucesso.", 4000);
    }
  );
});

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(function iniciarAplicacao() {
  carregarDados();
  painelPersist.style.display = "none";
  mostrarTela(telaLogin);
  inputUsuario.focus();
})();