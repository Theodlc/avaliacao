/* ==========================================================
   CONFIGURAÇÃO  —  ÚNICO TRECHO QUE VOCÊ PRECISA ALTERAR
   Ajuste para ficar igual ao seu backend Java.
   ========================================================== */
const CONFIG = {
  titulo: "Gerenciador de Produtos",       // título exibido na página
  apiBase: "http://localhost:8080",        // endereço e porta do seu Spring Boot
  recurso: "/produtos",                    // caminho do @RequestMapping do Controller
  campoId: "id",                           // nome do campo identificador no JSON
  // Campos da entidade (exceto o id). Os nomes devem ser IGUAIS aos atributos do JSON.
  // tipos aceitos: text, number, email, date
  campos: [
    { nome: "nome",      rotulo: "Nome",      tipo: "text",   obrigatorio: true },
    { nome: "descricao", rotulo: "Descrição", tipo: "text",   obrigatorio: false },
    { nome: "preco",     rotulo: "Preço",     tipo: "number", obrigatorio: true, step: "0.01" },
    { nome: "estoque",   rotulo: "Estoque",   tipo: "number", obrigatorio: true }
  ]
};

/* ==========================================================
   CÓDIGO DA APLICAÇÃO
   ========================================================== */
const URL_BASE = CONFIG.apiBase + CONFIG.recurso;   // ex.: http://localhost:8080/produtos
let registros = [];          // cópia local da lista que veio do backend
let idEmEdicao = null;       // null = modo cadastro | valor = modo edição

const el = {
  titulo: document.getElementById("titulo"),
  status: document.getElementById("status-api"),
  form: document.getElementById("formulario"),
  campos: document.getElementById("campos"),
  formTitulo: document.getElementById("form-titulo"),
  btnSalvar: document.getElementById("btn-salvar"),
  btnCancelar: document.getElementById("btn-cancelar"),
  cabecalho: document.getElementById("cabecalho"),
  corpo: document.getElementById("corpo"),
  vazio: document.getElementById("vazio"),
  busca: document.getElementById("busca"),
  aviso: document.getElementById("aviso")
};

/* ---------- Inicialização ---------- */
document.title = CONFIG.titulo;
el.titulo.textContent = CONFIG.titulo;
montarFormulario();
montarCabecalho();
listar();

el.form.addEventListener("submit", salvar);
el.btnCancelar.addEventListener("click", sairDoModoEdicao);
el.busca.addEventListener("input", desenharTabela);

/* ---------- Montagem dinâmica da interface ---------- */
function montarFormulario() {
  el.campos.innerHTML = "";
  CONFIG.campos.forEach(c => {
    const div = document.createElement("div");
    div.className = "campo";
    div.innerHTML = `
      <label for="campo-${c.nome}">${c.rotulo}${c.obrigatorio ? " *" : ""}</label>
      <input id="campo-${c.nome}" name="${c.nome}" type="${c.tipo}" ${c.step ? `step="${c.step}"` : ""}>
      <div class="erro">Preencha o campo ${c.rotulo.toLowerCase()}.</div>`;
    el.campos.appendChild(div);
  });
}

function montarCabecalho() {
  const colunas = [CONFIG.campoId.toUpperCase(), ...CONFIG.campos.map(c => c.rotulo), "Ações"];
  el.cabecalho.innerHTML = "<tr>" + colunas.map(t => `<th>${t}</th>`).join("") + "</tr>";
}

/* ---------- GET: busca todos os registros no backend ---------- */
async function listar() {
  try {
    // fetch envia uma requisição HTTP GET para o endpoint
    const resposta = await fetch(URL_BASE);
    if (!resposta.ok) throw new Error("Erro " + resposta.status);
    // converte o JSON da resposta em array de objetos JavaScript
    registros = await resposta.json();
    el.status.textContent = "Conectado a " + URL_BASE;
    desenharTabela();
  } catch (erro) {
    el.status.textContent = "Sem conexão com a API em " + URL_BASE;
    mostrarAviso("Não foi possível carregar os dados. Verifique se o backend está rodando e se o CORS está liberado.", true);
    console.error(erro);
  }
}

/* ---------- Mostra os dados na tabela (com filtro de busca) ---------- */
function desenharTabela() {
  const termo = el.busca.value.trim().toLowerCase();
  const filtrados = registros.filter(r =>
    CONFIG.campos.some(c => String(r[c.nome] ?? "").toLowerCase().includes(termo))
  );

  el.corpo.innerHTML = "";
  el.vazio.hidden = filtrados.length > 0;

  filtrados.forEach(r => {
    const tr = document.createElement("tr");
    if (r[CONFIG.campoId] === idEmEdicao) tr.className = "editando";

    const celulas = [r[CONFIG.campoId], ...CONFIG.campos.map(c => r[c.nome] ?? "")];
    celulas.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor;           // textContent evita injeção de HTML
      tr.appendChild(td);
    });

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "acoes-celula";
    const bEditar = criarBotao("Editar", "btn pequeno", () => entrarNoModoEdicao(r));
    const bExcluir = criarBotao("Excluir", "btn pequeno perigo", () => excluir(r));
    tdAcoes.append(bEditar, bExcluir);
    tr.appendChild(tdAcoes);

    el.corpo.appendChild(tr);
  });
}

function criarBotao(texto, classe, aoClicar) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = classe;
  b.textContent = texto;
  b.addEventListener("click", aoClicar);
  return b;
}

/* ---------- Lê o formulário e valida ---------- */
function lerFormulario() {
  const dados = {};
  let valido = true;

  CONFIG.campos.forEach(c => {
    const input = document.getElementById("campo-" + c.nome);
    const bruto = input.value.trim();
    const vazio = bruto === "";

    input.closest(".campo").classList.toggle("invalido", c.obrigatorio && vazio);
    if (c.obrigatorio && vazio) valido = false;

    // números precisam ir como número no JSON, não como texto
    dados[c.nome] = c.tipo === "number" ? (vazio ? null : Number(bruto)) : bruto;
  });

  return valido ? dados : null;
}

/* ---------- POST (cadastrar) ou PUT (atualizar) ---------- */
async function salvar(evento) {
  evento.preventDefault();            // impede o formulário de recarregar a página
  const dados = lerFormulario();
  if (!dados) return;

  const editando = idEmEdicao !== null;
  // PUT vai para /recurso/{id}; POST vai para /recurso
  const url = editando ? `${URL_BASE}/${idEmEdicao}` : URL_BASE;
  const metodo = editando ? "PUT" : "POST";

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },  // avisa que o corpo é JSON
      body: JSON.stringify(dados)                       // objeto JS -> texto JSON
    });
    if (!resposta.ok) throw new Error("Erro " + resposta.status);

    mostrarAviso(editando ? "Registro atualizado com sucesso!" : "Registro cadastrado com sucesso!");
    sairDoModoEdicao();
    await listar();                   // recarrega a lista para refletir a mudança
  } catch (erro) {
    mostrarAviso("Não foi possível salvar. " + erro.message, true);
    console.error(erro);
  }
}

/* ---------- DELETE: remove um registro ---------- */
async function excluir(registro) {
  const id = registro[CONFIG.campoId];
  if (!confirm(`Excluir o registro ${id}? Esta ação não pode ser desfeita.`)) return;

  try {
    const resposta = await fetch(`${URL_BASE}/${id}`, { method: "DELETE" });
    if (!resposta.ok) throw new Error("Erro " + resposta.status);

    mostrarAviso("Registro excluído com sucesso!");
    if (id === idEmEdicao) sairDoModoEdicao();
    await listar();
  } catch (erro) {
    mostrarAviso("Não foi possível excluir. " + erro.message, true);
    console.error(erro);
  }
}

/* ---------- Modo edição ---------- */
function entrarNoModoEdicao(registro) {
  idEmEdicao = registro[CONFIG.campoId];
  CONFIG.campos.forEach(c => {
    document.getElementById("campo-" + c.nome).value = registro[c.nome] ?? "";
  });
  el.formTitulo.textContent = "Editar registro " + idEmEdicao;
  el.btnSalvar.textContent = "Salvar alterações";
  el.btnCancelar.hidden = false;
  desenharTabela();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sairDoModoEdicao() {
  idEmEdicao = null;
  el.form.reset();
  document.querySelectorAll(".campo.invalido").forEach(c => c.classList.remove("invalido"));
  el.formTitulo.textContent = "Novo registro";
  el.btnSalvar.textContent = "Cadastrar";
  el.btnCancelar.hidden = true;
  desenharTabela();
}

/* ---------- Mensagem temporária ---------- */
let temporizador;
function mostrarAviso(texto, erro = false) {
  el.aviso.textContent = texto;
  el.aviso.className = "aviso mostrar" + (erro ? " erro" : "");
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.aviso.classList.remove("mostrar"), 4000);
}
