import { REACOES } from './reacoes.js';
import { PROJETOS, montarExemplo } from './seed.js';

const CHAVE = 'panicboard.v1';
const H = 3600e3;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduz = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- estado ---------- */
let S = carregar();
function carregar() {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) { const s = JSON.parse(raw); if (s && s.versao === 1) return s; }
  } catch { /* sem storage: segue com o exemplo */ }
  return montarExemplo(Date.now());
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch { /* ignora */ } }
const ui = { modo: lerUi('modo', 'prazo'), ideias: 'abertas', frente: null, pausado: lerUi('pausado', '0') === '1', tocando: new Set() };
function lerUi(k, d) { try { return localStorage.getItem(`panicboard.ui.${k}`) ?? d; } catch { return d; } }
function gravarUi(k, v) { try { localStorage.setItem(`panicboard.ui.${k}`, v); } catch { /* ignora */ } }

const agora = () => Date.now() + (S.deslocamentoH || 0) * H;
const proj = (id) => PROJETOS.find((p) => p.id === id);

/* ---------- tempo e texto ---------- */
function dur(ms) {
  const h = Math.abs(ms) / H;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}\u00a0min`;
  if (h < 48) return `${Math.round(h)}\u00a0h`;
  const d = Math.round(h / 24);
  return `${d}\u00a0dias`;
}
const fmtData = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtCurta = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const STATUS = { backlog: 'Backlog', fazer: 'A fazer', fazendo: 'Fazendo', revisao: 'Em revisão', feito: 'Feito' };
const FLUXO = ['fazer', 'fazendo', 'revisao', 'feito'];
const PRIO = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const ABERTO = (i) => ['fazer', 'fazendo', 'revisao'].includes(i.status);

const REGRAS = {
  atrasado: { nome: 'Atraso crítico', regra: 'O prazo passou e a demanda não foi concluída.', ordem: 0 },
  prazo_apertado: { nome: 'Prazo apertado', regra: 'Uma entrega vence nas próximas 24 horas.', ordem: 1 },
  abandonado: { nome: 'Projeto parado', regra: 'Há trabalho em andamento, mas nada se mexe há mais de 48 horas.', ordem: 2 },
  em_dia: { nome: 'Tudo em dia', regra: 'Todas as demandas do ciclo foram entregues.', ordem: 4 },
};

function estadoItem(i, t = agora()) {
  if (i.status === 'feito') return 'feito';
  if (!i.prazo || !ABERTO(i)) return 'normal';
  const p = Date.parse(i.prazo);
  if (p < t) return 'atrasado';
  if (p - t <= 24 * H) return 'prazo_apertado';
  return 'normal';
}
function prazoTexto(i, t = agora()) {
  if (i.status === 'feito') return 'Entregue';
  if (!i.prazo) return 'Sem prazo';
  const d = Date.parse(i.prazo) - t;
  return d < 0 ? `Atrasada há ${dur(d)}` : `Vence em ${dur(d)}`;
}

function avaliar(pid, t = agora()) {
  const itens = S.itens.filter((i) => i.projeto === pid);
  const abertos = itens.filter(ABERTO);
  const atrasados = abertos.filter((i) => estadoItem(i, t) === 'atrasado').sort((a, b) => Date.parse(a.prazo) - Date.parse(b.prazo));
  const apertados = abertos.filter((i) => estadoItem(i, t) === 'prazo_apertado').sort((a, b) => Date.parse(a.prazo) - Date.parse(b.prazo));
  const andamento = itens.filter((i) => ['fazendo', 'revisao'].includes(i.status));
  const ultima = Math.max(...itens.map((i) => Date.parse(i.atualizado)), 0);
  const parado = t - ultima;
  const base = { pid, itens, abertos, atrasados, apertados, andamento, ultima, parado, feitos: itens.filter((i) => i.status === 'feito') };
  if (atrasados.length) return { ...base, regra: 'atrasado', estado: atrasados.length > 1 ? `${atrasados.length} atrasadas, a pior há ${dur(Date.parse(atrasados[0].prazo) - t)}` : `Atrasada há ${dur(Date.parse(atrasados[0].prazo) - t)}` };
  if (apertados.length) return { ...base, regra: 'prazo_apertado', estado: `Entrega em ${dur(Date.parse(apertados[0].prazo) - t)}` };
  if (andamento.length && parado >= 48 * H) return { ...base, regra: 'abandonado', estado: `Parado há ${dur(parado)}` };
  if (!abertos.length && base.feitos.length) return { ...base, regra: 'em_dia', estado: 'Ciclo entregue' };
  return { ...base, regra: null, estado: abertos.length ? 'Andando no ritmo' : 'Sem demandas' };
}
const ordemRegra = (r) => (r ? REGRAS[r].ordem : 3);

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function reacao(regra, pid = '') {
  const lista = REACOES[regra];
  return lista[(hash(pid) + (S.girar?.[regra] || 0)) % lista.length];
}
const nomeCurto = (r) => r.personagem.split(/[(:]/)[0].trim();

/* ---------- GIF com fallback e movimento reduzido ---------- */
const parado = () => reduz.matches || ui.pausado;
function gifHtml(r, { chave, tarja = true, classe = '', tocar } = {}) {
  const tocando = tocar ?? (!parado() || ui.tocando.has(chave));
  return `<div class="gif ${classe}" data-gif="${esc(chave)}">
    <img src="${esc(tocando ? r.gif : r.still)}" data-anim="${esc(r.gif)}" data-still="${esc(r.still)}" alt="${esc(r.personagem)}, ${esc(r.obra)}" decoding="async" loading="lazy">
    <div class="gif__falha" aria-hidden="true"><strong>${esc(nomeCurto(r))}</strong><span>${esc(r.obra)}</span></div>
    ${tarja ? `<p class="tarja"><span class="tarja__quem">${esc(nomeCurto(r))}</span><span class="tarja__fala">${esc(r.fala_curta_pt)}</span></p>` : ''}
    <a class="gif__credito" href="${esc(r.pagina)}" target="_blank" rel="noopener">via GIPHY</a>
    ${parado() ? `<button class="gif__tocar" type="button" data-tocar="${esc(chave)}" aria-pressed="${tocando}">${tocando ? 'Parar GIF' : 'Tocar GIF'}</button>` : ''}
  </div>`;
}
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.closest('.gif')) img.closest('.gif').classList.add('is-falha');
}, true);

/* ---------- ícones ---------- */
const ICO = {
  atrasado: '<path d="M12 3.5 21 19H3z"/><path d="M12 10v4M12 16.6v.4"/>',
  prazo_apertado: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9.5 2.8h5"/>',
  abandonado: '<path d="M5 19c2-6 4-9 7-9s5 3 7 9"/><path d="M12 10V4M8 4h8"/>',
  em_dia: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.7 2.7L16.2 9.5"/>',
  normal: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
  feito: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  seta: '<path d="M5 12h13M13 6.5 18.5 12 13 17.5"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  alta: '<path d="M6 15l6-6 6 6"/>', media: '<path d="M6 12h12"/>', baixa: '<path d="M6 9l6 6 6-6"/>',
  lixo: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7"/>',
};
const ico = (n, c = '') => `<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICO[n] || ICO.normal}</svg>`;
const tagProj = (p) => `<span class="ptag" style="--pc:${p.cor}"><span class="ptag__dot"></span>${esc(p.curto)}</span>`;

/* ---------- RADAR ---------- */
function renderRadar() {
  const t = agora();
  const av = PROJETOS.map((p) => avaliar(p.id, t)).sort((a, b) => ordemRegra(a.regra) - ordemRegra(b.regra));

  $('[data-hero-hora]').textContent = S.deslocamentoH ? `Relógio simulado · ${fmtData.format(t)}` : `Ao vivo · ${fmtData.format(t)}`;
  const partes = av.map((a) => {
    const p = proj(a.pid);
    if (a.regra === 'atrasado') return `${p.curto} tem ${a.atrasados.length === 1 ? 'uma demanda atrasada' : `${a.atrasados.length} demandas atrasadas`}`;
    if (a.regra === 'prazo_apertado') return `${p.curto} entrega em ${dur(Date.parse(a.apertados[0].prazo) - t)}`;
    if (a.regra === 'abandonado') return `${p.curto} está parado há ${dur(a.parado)}`;
    if (a.regra === 'em_dia') return `${p.curto} fechou o ciclo`;
    return `${p.curto} segue no ritmo`;
  });
  $('[data-hero-lead]').textContent = `Agora: ${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}. Clique num projeto para ver as demandas.`;

  // palco em camadas: o mais urgente na frente
  if (!ui.frente || !av.some((a) => a.pid === ui.frente)) ui.frente = av[0].pid;
  const ordem = [av.find((a) => a.pid === ui.frente), ...av.filter((a) => a.pid !== ui.frente)];
  $('[data-palco]').innerHTML = ordem.map((a, i) => {
    const p = proj(a.pid);
    const r = a.regra ? reacao(a.regra, a.pid) : null;
    const frente = i === 0;
    return `<div class="camada" style="--i:${i};--pc:${p.cor};--pt:${p.tinta}" data-camada="${p.id}">
      <button class="camada__alvo" type="button" data-camada-btn="${p.id}" aria-label="${frente ? `Ver demandas de ${esc(p.curto)} no quadro` : `Trazer ${esc(p.curto)} para a frente`}"></button>
      <div class="camada__cab"><span class="camada__nome">${esc(p.nome)}</span><span class="camada__estado">${ico(a.regra || 'normal')}${esc(a.estado)}</span></div>
      <div class="camada__corpo">
        ${r ? gifHtml(r, { chave: `palco-${p.id}`, tarja: frente, tocar: frente ? undefined : false }) : `<div class="camada__calma"><strong>${esc(a.estado)}</strong><span>${a.abertos.length} abertas, nenhuma regra disparada</span></div>`}
      </div>
    </div>`;
  }).reverse().join('');

  // canais
  $('[data-canais]').innerHTML = av.map((a) => {
    const p = proj(a.pid);
    const proximas = a.abertos.slice().sort((x, y) => (Date.parse(x.prazo) || 9e15) - (Date.parse(y.prazo) || 9e15)).slice(0, 3);
    return `<article class="canal" style="--pc:${p.cor};--pt:${p.tinta}">
      <header class="canal__cab"><h3>${esc(p.nome)}</h3><span class="canal__sigla">${p.sigla}</span></header>
      <p class="canal__estado est--${a.regra || 'normal'}">${ico(a.regra || 'normal')}<span>${esc(a.estado)}</span></p>
      <dl class="canal__nums">
        <div><dt>Abertas</dt><dd>${a.abertos.length}</dd></div>
        <div><dt>Atrasadas</dt><dd>${a.atrasados.length}</dd></div>
        <div><dt>Mexeu</dt><dd>${a.ultima ? `há ${dur(t - a.ultima)}` : '—'}</dd></div>
      </dl>
      <ul class="canal__lista">${proximas.length ? proximas.map((i) => `<li><button type="button" class="canal__item" data-abrir="${i.id}"><span class="canal__id">${i.id}</span><span class="canal__tit">${esc(i.titulo)}</span><span class="canal__prazo est-t--${estadoItem(i, t)}">${prazoTexto(i, t)}</span></button></li>`).join('') : (a.feitos.length ? `<li class="canal__vazio">Nada aberto. Entregues por último:</li>${a.feitos.slice().sort((x, y) => Date.parse(y.atualizado) - Date.parse(x.atualizado)).slice(0, 3).map((i) => `<li><button type="button" class="canal__item" data-abrir="${i.id}"><span class="canal__id">${i.id}</span><span class="canal__tit">${esc(i.titulo)}</span><span class="canal__prazo est-t--feito">Entregue há ${dur(t - Date.parse(i.atualizado))}</span></button></li>`).join('')}` : '<li class="canal__vazio">Nada aberto neste ciclo.</li>')}</ul>
      <a class="link canal__ver" href="#/quadro/${p.id}">Ver as ${a.itens.length} demandas de ${esc(p.curto)}</a>
    </article>`;
  }).join('');

  // as quatro regras
  $('[data-regras]').innerHTML = Object.entries(REGRAS).map(([k, R]) => {
    const quem = av.filter((a) => a.regra === k);
    const lista = REACOES[k];
    const r = lista[(S.girar?.[k] || 0) % lista.length];
    return `<article class="regra est--${k}">
      ${gifHtml(r, { chave: `regra-${k}` })}
      <div class="regra__txt">
        <h3>${ico(k)}${R.nome}</h3>
        <p>${R.regra}</p>
        <p class="regra__quem">${quem.length ? `Agora em ${quem.map((a) => `<a class="link" href="#/quadro/${a.pid}">${esc(proj(a.pid).curto)}</a>`).join(', ')}` : '<span class="muted">Nenhum projeto nesta regra agora.</span>'}</p>
        <button class="link regra__trocar" type="button" data-girar="${k}">Trocar o GIF (${(S.girar?.[k] || 0) % lista.length + 1} de ${lista.length})</button>
      </div>
    </article>`;
  }).join('');

  const prox = S.itens.filter((i) => ABERTO(i) && i.prazo && Date.parse(i.prazo) >= t).sort((a, b) => Date.parse(a.prazo) - Date.parse(b.prazo))[0];
  $('[data-fecho-nota]').textContent = prox ? `Próxima entrega: ${prox.id}, ${prox.titulo}, em ${dur(Date.parse(prox.prazo) - t)}.` : 'Nenhuma entrega com prazo pela frente.';
}

/* ---------- QUADRO ---------- */
function renderQuadro(filtro) {
  const t = agora();
  const filtros = [{ id: 'todos', curto: 'Todos', cor: 'var(--ink)' }, ...PROJETOS];
  $('[data-filtros]').innerHTML = filtros.map((p) => {
    const n = S.itens.filter((i) => (p.id === 'todos' || i.projeto === p.id) && ABERTO(i)).length;
    const a = p.id !== 'todos' ? avaliar(p.id, t) : null;
    return `<a class="filtro" href="#/quadro${p.id === 'todos' ? '' : `/${p.id}`}" style="--pc:${p.cor}" ${filtro === p.id ? 'aria-current="page"' : ''}>
      ${p.id !== 'todos' ? '<span class="ptag__dot"></span>' : ''}<span>${esc(p.curto)}</span><span class="filtro__n">${n}</span>${a?.regra ? `<span class="filtro__est est--${a.regra}" data-tip="${REGRAS[a.regra].nome}">${ico(a.regra)}</span>` : ''}</a>`;
  }).join('');
  $$('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === ui.modo)));

  const itens = S.itens.filter((i) => filtro === 'todos' || i.projeto === filtro);
  let raias;
  if (ui.modo === 'prazo') {
    const ab = itens.filter(ABERTO).sort((a, b) => (Date.parse(a.prazo) || 9e15) - (Date.parse(b.prazo) || 9e15));
    const em = (i) => (i.prazo ? Date.parse(i.prazo) - t : null);
    raias = [
      { id: 'atrasadas', nome: 'Atrasadas', est: 'atrasado', itens: ab.filter((i) => em(i) !== null && em(i) < 0) },
      { id: 'h24', nome: 'Próximas 24 h', est: 'prazo_apertado', itens: ab.filter((i) => em(i) !== null && em(i) >= 0 && em(i) <= 24 * H) },
      { id: 'semana', nome: 'Esta semana', itens: ab.filter((i) => em(i) !== null && em(i) > 24 * H && em(i) <= 7 * 24 * H) },
      { id: 'depois', nome: 'Depois ou sem prazo', itens: ab.filter((i) => em(i) === null || em(i) > 7 * 24 * H) },
      { id: 'feitas', nome: 'Entregues', est: 'feito', itens: itens.filter((i) => i.status === 'feito').sort((a, b) => Date.parse(b.atualizado) - Date.parse(a.atualizado)) },
    ];
  } else {
    raias = (itens.some((i) => i.status === 'backlog') ? ['backlog', ...FLUXO] : FLUXO).map((s) => ({ id: s, nome: STATUS[s], est: s === 'feito' ? 'feito' : null, itens: itens.filter((i) => i.status === s) }));
  }
  $('[data-raias]').innerHTML = raias.map((r) => `<section class="raia" aria-labelledby="raia-${r.id}">
    <h2 class="raia__h" id="raia-${r.id}">${r.est ? ico(r.est, `est-t--${r.est}`) : ''}<span>${r.nome}</span><span class="raia__n">${r.itens.length}</span></h2>
    <div class="raia__lista">${r.itens.length ? r.itens.map((i) => cartao(i, t)).join('') : `<p class="raia__vazia">${r.id === 'atrasadas' ? 'Nada atrasado. Siga assim.' : 'Vazio.'}</p>`}</div>
  </section>`).join('');
}
function cartao(i, t) {
  const p = proj(i.projeto);
  const est = estadoItem(i, t);
  const prox = FLUXO[FLUXO.indexOf(i.status) + 1];
  const ck = i.checklist.length ? `<span class="cartao__ck">${i.checklist.filter((c) => c.feito).length}/${i.checklist.length}</span>` : '';
  return `<article class="cartao est-c--${est}" style="--pc:${p.cor}">
    <button class="cartao__abrir" type="button" data-abrir="${i.id}">
      <span class="cartao__topo"><span class="cartao__id">${i.id}</span>${tagProj(p)}<span class="cartao__prio prio--${i.prioridade}" data-tip="Prioridade ${PRIO[i.prioridade].toLowerCase()}">${ico(i.prioridade)}<span class="sr">Prioridade ${PRIO[i.prioridade]}</span></span></span>
      <span class="cartao__tit">${esc(i.titulo)}</span>
      <span class="cartao__pe"><span class="cartao__prazo est-t--${est}">${est === 'atrasado' || est === 'prazo_apertado' ? ico(est) : ''}${prazoTexto(i, t)}</span>${ui.modo === 'prazo' ? `<span class="cartao__status">${STATUS[i.status]}</span>` : ''}${ck}</span>
    </button>
    ${prox ? `<button class="cartao__avancar" type="button" data-avancar-item="${i.id}" aria-label="Mover ${i.id} para ${STATUS[prox]}" data-tip="Mover para ${STATUS[prox]}">${ico(prox === 'feito' ? 'feito' : 'seta')}</button>` : ''}
  </article>`;
}

/* ---------- IDEIAS ---------- */
function renderIdeias() {
  $$('[data-ideias-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ideiasFiltro === ui.ideias)));
  const lista = S.ideias.filter((d) => (ui.ideias === 'abertas' ? !d.promovida : d.promovida)).sort((a, b) => Date.parse(b.criado) - Date.parse(a.criado));
  const t = agora();
  $('[data-ideias]').innerHTML = lista.length ? lista.map((d) => {
    const texto = esc(d.texto).replace(/#([\p{L}\d_-]+)/gu, '<span class="hashtag">#$1</span>');
    const item = d.promovida && S.itens.find((i) => i.id === d.promovida);
    return `<article class="ideia">
      <p class="ideia__txt">${texto}</p>
      <p class="ideia__quando">${d.id} · há ${dur(t - Date.parse(d.criado))}</p>
      ${item ? `<p class="ideia__virou">Virou <button class="link" type="button" data-abrir="${item.id}">${item.id}</button> em ${esc(proj(item.projeto).curto)}</p>` : `
      <div class="ideia__promo" role="group" aria-label="Promover ${d.id} a demanda de um projeto">
        <span class="ideia__promo-rot">Promover para</span>
        ${PROJETOS.map((p) => `<button type="button" class="promo" style="--pc:${p.cor};--pt:${p.tinta}" data-promover="${d.id}" data-proj="${p.id}" aria-label="Promover a demanda de ${esc(p.curto)}">${p.sigla}</button>`).join('')}
      </div>
      <button class="ideia__descartar" type="button" data-descartar="${d.id}" aria-label="Descartar ${d.id}">${ico('lixo')}</button>`}
    </article>`;
  }).join('') : `<p class="ideias__vazio">${ui.ideias === 'abertas' ? 'Nenhuma ideia solta. A próxima que aparecer, anote aqui em cima.' : 'Nenhuma ideia promovida ainda.'}</p>`;
}

/* ---------- calendário próprio do prazo ---------- */
const p2 = (n) => String(n).padStart(2, '0');
const paraLocal = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const fmtRot = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
function prazoRotulo(v) {
  if (!v) return 'Sem prazo';
  const d = new Date(v); const t = agora();
  return `${fmtRot.format(d)}, ${p2(d.getHours())}:${p2(d.getMinutes())} · ${d - t < 0 ? `passou há ${dur(d - t)}` : `em ${dur(d - t)}`}`;
}
const MESES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
let calMes = null;
function renderCal() {
  const pop = $('#prazo-pop'); if (!pop) return;
  const v = $('#f-prazo').value; const sel = v ? new Date(v) : null; const hoje = new Date(agora());
  if (!calMes) calMes = new Date((sel || hoje).getFullYear(), (sel || hoje).getMonth(), 1);
  const ini = new Date(calMes); ini.setDate(1 - ini.getDay());
  const dias = Array.from({ length: 42 }, (_, n) => { const d = new Date(ini); d.setDate(ini.getDate() + n); return d; });
  const mesmo = (a, b) => a && b && a.toDateString() === b.toDateString();
  const hora = sel ? `${p2(sel.getHours())}:${p2(sel.getMinutes())}` : '18:00';
  pop.innerHTML = `<div class="cal__atalhos">${[['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['3d', 'Em 3 dias'], ['seg', 'Próxima segunda'], ['limpar', 'Sem prazo']].map(([k, r]) => `<button type="button" class="chip" data-prazo-atalho="${k}">${r}</button>`).join('')}</div>
    <div class="cal__cab"><button type="button" class="cal__nav" data-prazo-mes="-1" aria-label="Mês anterior">${ico('seta', 'ico--vira')}</button><strong>${MESES.format(calMes)}</strong><button type="button" class="cal__nav" data-prazo-mes="1" aria-label="Próximo mês">${ico('seta')}</button></div>
    <div class="cal__grade" role="grid">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x) => `<span class="cal__sem" aria-hidden="true">${x}</span>`).join('')}${dias.map((d) => `<button type="button" class="cal__dia${d.getMonth() !== calMes.getMonth() ? ' is-fora' : ''}${mesmo(d, hoje) ? ' is-hoje' : ''}" data-prazo-dia="${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}" aria-pressed="${mesmo(d, sel)}" aria-label="${fmtRot.format(d)}">${d.getDate()}</button>`).join('')}</div>
    <div class="cal__horas"><span class="campo__rot">Hora</span>${['09:00', '12:00', '14:00', '18:00'].map((h) => `<button type="button" class="chip" data-prazo-hora="${h}" aria-pressed="${h === hora}">${h}</button>`).join('')}</div>`;
}
function definirPrazo(d, fechar) {
  const inp = $('#f-prazo'); inp.value = d ? paraLocal(d) : '';
  $('#f-prazo-txt').textContent = prazoRotulo(inp.value);
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  if (fechar) abrirCal(false); else renderCal();
}
function abrirCal(abrir) {
  const pop = $('#prazo-pop'); const b = $('[data-prazo-abrir]'); if (!pop) return;
  const v = abrir ?? pop.hidden; pop.hidden = !v; b.setAttribute('aria-expanded', String(v));
  if (v) { calMes = null; renderCal(); $('.cal__dia[aria-pressed="true"], .cal__dia.is-hoje', pop)?.focus(); }
}

/* ---------- ficha (gaveta) ---------- */
let fichaAtual = null; let voltaFoco = null;
function abrirFicha(id, novo = null) {
  voltaFoco = document.activeElement;
  const g = $('[data-gaveta]');
  const t = agora();
  const i = novo || S.itens.find((x) => x.id === id);
  if (!i) return;
  fichaAtual = novo ? null : i.id;
  const p = proj(i.projeto);
  const est = novo ? 'normal' : estadoItem(i, t);
  const r = est === 'atrasado' || est === 'prazo_apertado' ? reacao(est, i.id) : null;
  const local = i.prazo ? new Date(Date.parse(i.prazo) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
  g.innerHTML = `<form class="ficha" data-ficha novalidate style="--pc:${p.cor}">
    <div class="ficha__cab">
      <p class="ficha__id">${novo ? 'Nova demanda' : `${i.id} · ${tagProj(p)}`}</p>
      <button class="ficha__fechar" type="button" data-fechar aria-label="Fechar a ficha">${ico('fechar')}</button>
    </div>
    <h2 id="gaveta-h" class="ficha__h">${novo ? 'O que precisa ser feito?' : esc(i.titulo)}</h2>
    ${r ? `<div class="ficha__reacao est--${est}">${gifHtml(r, { chave: `ficha-${i.id}`, classe: 'gif--mini' })}<p><strong>${prazoTexto(i, t)}.</strong> ${REGRAS[est].regra}</p></div>` : ''}
    <div class="campo"><label for="f-titulo">Título</label><input id="f-titulo" name="titulo" value="${esc(novo ? '' : i.titulo)}" autocomplete="off" aria-describedby="f-titulo-erro"><p class="field__error" id="f-titulo-erro" hidden>Escreva um título para a demanda.</p></div>
    ${novo ? `<fieldset class="campo"><legend>Projeto</legend><div class="opcoes">${PROJETOS.map((x) => `<label class="opc opc--proj" style="--pc:${x.cor};--pt:${x.tinta}"><input type="radio" name="projeto" value="${x.id}" ${x.id === i.projeto ? 'checked' : ''}><span><i class="ptag__dot" aria-hidden="true"></i>${esc(x.curto)}</span></label>`).join('')}</div></fieldset>` : ''}
    <fieldset class="campo"><legend>Status</legend><div class="seg seg--status">${['backlog', ...FLUXO].map((s) => `<label><input type="radio" name="status" value="${s}" ${i.status === s ? 'checked' : ''}><span>${STATUS[s]}</span></label>`).join('')}</div></fieldset>
    <fieldset class="campo"><legend>Prioridade</legend><div class="opcoes">${Object.entries(PRIO).map(([k, v]) => `<label class="opc opc--prio prio--${k}"><input type="radio" name="prioridade" value="${k}" ${i.prioridade === k ? 'checked' : ''}><span>${ico(k)}${v}</span></label>`).join('')}</div></fieldset>
    <div class="campo prazo" data-prazo>
      <span class="campo__rot" id="f-prazo-rot">Prazo</span>
      <button type="button" class="prazo__btn" data-prazo-abrir aria-expanded="false" aria-controls="prazo-pop" aria-labelledby="f-prazo-rot f-prazo-txt"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg><span id="f-prazo-txt">${prazoRotulo(local)}</span></button>
      <input type="hidden" name="prazo" id="f-prazo" value="${local}">
      <div class="prazo__pop" id="prazo-pop" role="dialog" aria-label="Escolher prazo" hidden></div>
    </div>
    <div class="campo"><label for="f-desc">Detalhes técnicos</label><textarea id="f-desc" name="descricao" rows="5">${esc(i.descricao)}</textarea></div>
    <fieldset class="campo"><legend>Checklist</legend>
      <ul class="ck">${i.checklist.map((c, n) => `<li><label><input type="checkbox" data-ck="${n}" ${c.feito ? 'checked' : ''}><span>${esc(c.t)}</span></label></li>`).join('')}</ul>
      <div class="ck__novo"><label class="sr" for="f-ck">Novo passo</label><input id="f-ck" placeholder="Novo passo" autocomplete="off"><button class="btn btn--secondary" type="button" data-ck-add>Adicionar passo</button></div>
    </fieldset>
    ${novo ? `<div class="ficha__acoes"><button class="btn btn--primary" type="submit">Criar demanda</button><button class="btn btn--secondary" type="button" data-fechar>Cancelar</button></div>` : `
    <section class="hist" aria-labelledby="hist-h"><h3 id="hist-h">Histórico</h3><ol>${i.historico.slice().reverse().map((h) => `<li><time datetime="${h.em}">${fmtCurta.format(Date.parse(h.em))}</time><span>${esc(h.texto)}</span></li>`).join('')}</ol></section>
    <p class="ficha__salvo">Cada mudança é salva na hora e entra no histórico.</p>`}
  </form>`;
  g.hidden = false;
  requestAnimationFrame(() => g.classList.add('is-aberta'));
  document.body.classList.add('com-ficha');
  (novo ? $('#f-titulo', g) : $('.ficha__fechar', g)).focus();
  g._novo = novo;
}
function fecharFicha() {
  const g = $('[data-gaveta]');
  if (g.hidden) return;
  g.classList.remove('is-aberta');
  document.body.classList.remove('com-ficha');
  setTimeout(() => { g.hidden = true; g.innerHTML = ''; }, reduz.matches ? 0 : 220);
  fichaAtual = null;
  if (voltaFoco && document.contains(voltaFoco)) voltaFoco.focus();
}
function registrar(i, texto) { i.atualizado = new Date(agora()).toISOString(); i.historico.push({ em: i.atualizado, texto }); }
function mudarCampo(i, nome, valor) {
  if (nome === 'status' && valor !== i.status) { registrar(i, `Movida de ${STATUS[i.status]} para ${STATUS[valor]}`); i.status = valor; }
  else if (nome === 'prioridade' && valor !== i.prioridade) { registrar(i, `Prioridade ${PRIO[i.prioridade]} → ${PRIO[valor]}`); i.prioridade = valor; }
  else if (nome === 'prazo') { const novo = valor ? new Date(valor).toISOString() : null; if (novo !== i.prazo) { i.prazo = novo; registrar(i, novo ? `Prazo para ${fmtCurta.format(Date.parse(novo))}` : 'Prazo removido'); } }
  else if (nome === 'titulo' && valor.trim() && valor.trim() !== i.titulo) { i.titulo = valor.trim(); registrar(i, 'Título editado'); }
  else if (nome === 'descricao' && valor !== i.descricao) { i.descricao = valor; registrar(i, 'Detalhes editados'); }
  else return false;
  return true;
}
function novaDemanda(pid) {
  const t = agora();
  abrirFicha(null, { id: 'novo', projeto: pid || PROJETOS[0].id, titulo: '', status: 'fazer', prioridade: 'media', prazo: new Date(t + 72 * H).toISOString(), descricao: '', checklist: [], historico: [] });
}
function criarItem(dados, origem) {
  const p = proj(dados.projeto);
  S.seq[p.id] = (S.seq[p.id] || 0) + 1;
  const em = new Date(agora()).toISOString();
  const item = { ...dados, id: `${p.sigla}-${S.seq[p.id]}`, criado: em, atualizado: em, historico: [{ em, texto: origem || 'Demanda criada' }] };
  S.itens.push(item);
  return item;
}

/* ---------- aviso ---------- */
let avisoT;
function avisar(msg, acao) {
  const el = $('[data-aviso]');
  el.innerHTML = `<span>${esc(msg)}</span>${acao ? `<button type="button" class="link" data-aviso-acao>${esc(acao.rotulo)}</button>` : ''}`;
  el.classList.add('is-on');
  if (acao) $('[data-aviso-acao]', el).onclick = () => { acao.fn(); el.classList.remove('is-on'); };
  clearTimeout(avisoT); avisoT = setTimeout(() => el.classList.remove('is-on'), 6000);
}

/* ---------- rotas ---------- */
function rota() {
  const [, nome = '', sub = ''] = location.hash.split('/');
  return { nome: ['quadro', 'ideias'].includes(nome) ? nome : 'radar', sub: PROJETOS.some((p) => p.id === sub) ? sub : 'todos' };
}
let rotaAtual = null;
function render() {
  const r = rota();
  $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== r.nome; });
  $$('[data-rota]').forEach((a) => (a.dataset.rota === r.nome ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.documentElement.dataset.tela = r.nome;
  if (r.nome === 'radar') renderRadar();
  if (r.nome === 'quadro') renderQuadro(r.sub);
  if (r.nome === 'ideias') renderIdeias();
  $('[data-relogio-rotulo]').textContent = S.deslocamentoH ? `+${S.deslocamentoH >= 24 && S.deslocamentoH % 24 === 0 ? `${S.deslocamentoH / 24} ${S.deslocamentoH === 24 ? 'dia' : 'dias'}` : `${S.deslocamentoH} h`}` : 'Agora';
  $('[data-relogio-data]').textContent = fmtData.format(agora());
  document.documentElement.classList.toggle('is-pausado', ui.pausado);
  $('[data-pausa]').setAttribute('aria-pressed', String(ui.pausado));
  $('[data-pausa]').setAttribute('aria-label', ui.pausado ? 'Retomar o movimento da tela' : 'Pausar o movimento da tela');
  return r;
}
function navegar() {
  const anterior = rotaAtual;
  const trocar = () => { const r = render(); rotaAtual = r.nome; if (anterior && anterior !== r.nome) { scrollTo(0, 0); const h1 = $(`[data-view="${r.nome}"] h1`); h1?.setAttribute('tabindex', '-1'); h1?.focus({ preventScroll: true }); } };
  if (anterior && anterior !== rota().nome && document.startViewTransition && !reduz.matches) document.startViewTransition(trocar);
  else trocar();
  if (anterior === null) revelarMomento();
}
window.addEventListener('hashchange', navegar);

/* ---------- momento: as reações revelam uma vez ---------- */
function revelarMomento() {
  const sec = $('#reacoes');
  if (reduz.matches || !('IntersectionObserver' in window)) return;
  sec.classList.add('pre-revelar');
  const io = new IntersectionObserver((ents) => {
    if (ents.some((e) => e.isIntersecting)) { sec.classList.add('is-revelado'); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(sec);
}

/* ---------- relógio ---------- */
function avancar(h) {
  const antes = Object.fromEntries(PROJETOS.map((p) => [p.id, avaliar(p.id).regra]));
  S.deslocamentoH = h === 0 ? 0 : (S.deslocamentoH || 0) + h;
  salvar();
  ui.frente = null;
  render();
  const mud = PROJETOS.map((p) => { const d = avaliar(p.id).regra; return d !== antes[p.id] ? `${p.curto}: ${d ? REGRAS[d].nome : 'sem alerta'}` : null; }).filter(Boolean);
  avisar(`${h === 0 ? 'Relógio de volta para agora' : `Relógio em ${$('[data-relogio-rotulo]').textContent}`}. ${mud.length ? mud.join(' · ') : 'Nenhuma reação mudou.'}`);
}
function abrirRelogio(abrir) {
  const b = $('[data-relogio-btn]'); const p = $('#relogio-painel');
  const v = abrir ?? p.hidden;
  p.hidden = !v; b.setAttribute('aria-expanded', String(v));
}

/* ---------- eventos ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('button, a');
  if (!el) { if (!e.target.closest('.relogio')) abrirRelogio(false); if (!e.target.closest('[data-prazo]')) abrirCal(false); return; }
  const d = el.dataset;
  if (!el.closest('.relogio')) abrirRelogio(false);
  if (!el.closest('[data-prazo]')) abrirCal(false);
  if ('prazoAbrir' in d) return abrirCal();
  if ('prazoMes' in d) { calMes = new Date(calMes.getFullYear(), calMes.getMonth() + +d.prazoMes, 1); renderCal(); $(`[data-prazo-mes="${d.prazoMes}"]`)?.focus(); return; }
  if ('prazoDia' in d) { const v = $('#f-prazo').value; const [hh, mm] = v ? v.slice(11, 16).split(':') : ['18', '00']; const [y, m, dd] = d.prazoDia.split('-'); definirPrazo(new Date(+y, m - 1, +dd, +hh, +mm)); $(`[data-prazo-dia="${d.prazoDia}"]`)?.focus(); return; }
  if ('prazoHora' in d) { const v = $('#f-prazo').value; const base = v ? new Date(v) : new Date(agora()); const [hh, mm] = d.prazoHora.split(':'); base.setHours(+hh, +mm, 0, 0); return definirPrazo(base, true); }
  if ('prazoAtalho' in d) {
    const b = new Date(agora()); b.setHours(18, 0, 0, 0);
    if (d.prazoAtalho === 'limpar') { definirPrazo(null, true); return $('[data-prazo-abrir]').focus(); }
    if (d.prazoAtalho === 'amanha') b.setDate(b.getDate() + 1);
    if (d.prazoAtalho === '3d') b.setDate(b.getDate() + 3);
    if (d.prazoAtalho === 'seg') b.setDate(b.getDate() + (((8 - b.getDay()) % 7) || 7));
    definirPrazo(b, true); return $('[data-prazo-abrir]').focus();
  }
  if ('relogioBtn' in d) return abrirRelogio();
  if ('tema' in d) return trocarTema();
  if ('avancar' in d) { abrirRelogio(false); return avancar(+d.avancar); }
  if ('restaurar' in d) {
    const antes = S; S = montarExemplo(Date.now()); salvar(); abrirRelogio(false); ui.frente = null; render();
    return avisar('Dados de exemplo restaurados.', { rotulo: 'Desfazer', fn: () => { S = antes; salvar(); render(); } });
  }
  if ('nova' in d) return novaDemanda(rota().nome === 'quadro' && rota().sub !== 'todos' ? rota().sub : undefined);
  if ('abrir' in d) return abrirFicha(d.abrir);
  if ('fechar' in d) return fecharFicha();
  if ('camadaBtn' in d) {
    if (ui.frente === d.camadaBtn) { location.hash = `#/quadro/${d.camadaBtn}`; return; }
    ui.frente = d.camadaBtn; renderRadar(); $(`[data-camada-btn="${d.camadaBtn}"]`)?.focus(); return;
  }
  if ('girar' in d) { S.girar = { ...S.girar, [d.girar]: (S.girar?.[d.girar] || 0) + 1 }; salvar(); renderRadar(); $(`[data-girar="${d.girar}"]`)?.focus(); return; }
  if ('tocar' in d) {
    const k = d.tocar; const g = el.closest('.gif'); const img = $('img', g);
    const vai = !ui.tocando.has(k);
    vai ? ui.tocando.add(k) : ui.tocando.delete(k);
    img.src = vai ? img.dataset.anim : img.dataset.still;
    el.textContent = vai ? 'Parar GIF' : 'Tocar GIF'; el.setAttribute('aria-pressed', String(vai));
    return;
  }
  if ('pausa' in d) { ui.pausado = !ui.pausado; gravarUi('pausado', ui.pausado ? '1' : '0'); ui.tocando.clear(); render(); return; }
  if ('modo' in d) { ui.modo = d.modo; gravarUi('modo', ui.modo); renderQuadro(rota().sub); return; }
  if ('ideiasFiltro' in d) { ui.ideias = d.ideiasFiltro; renderIdeias(); return; }
  if ('avancarItem' in d) {
    const i = S.itens.find((x) => x.id === d.avancarItem);
    const prox = FLUXO[FLUXO.indexOf(i.status) + 1];
    if (!prox) return;
    mudarCampo(i, 'status', prox); salvar(); renderQuadro(rota().sub);
    const alvo = $(`[data-avancar-item="${i.id}"]`) || $(`[data-abrir="${i.id}"]`);
    alvo?.focus();
    const a = avaliar(i.projeto);
    return avisar(`${i.id} foi para ${STATUS[prox]}.${a.regra === 'em_dia' ? ` ${proj(i.projeto).curto} fechou o ciclo.` : ''}`);
  }
  if ('promover' in d) {
    const idea = S.ideias.find((x) => x.id === d.promover);
    const limpo = idea.texto.replace(/#[\p{L}\d_-]+/gu, '').replace(/\s+/g, ' ').trim();
    const titulo = limpo.length > 90 ? `${limpo.slice(0, 88).trim()}…` : limpo;
    const item = criarItem({ projeto: d.proj, titulo, status: 'fazer', prioridade: 'media', prazo: null, descricao: idea.texto, checklist: [] }, `Promovida da ideia ${idea.id}`);
    idea.promovida = item.id; salvar(); renderIdeias();
    return avisar(`Virou ${item.id} em ${proj(d.proj).curto}.`, { rotulo: 'Abrir a ficha', fn: () => abrirFicha(item.id) });
  }
  if ('descartar' in d) {
    const n = S.ideias.findIndex((x) => x.id === d.descartar); const [fora] = S.ideias.splice(n, 1); salvar(); renderIdeias();
    return avisar(`${fora.id} descartada.`, { rotulo: 'Desfazer', fn: () => { S.ideias.splice(n, 0, fora); salvar(); renderIdeias(); } });
  }
  if ('ckAdd' in d) return addPasso();
});

function addPasso() {
  const inp = $('#f-ck'); const txt = inp.value.trim(); if (!txt) return inp.focus();
  const g = $('[data-gaveta]');
  if (g._novo) { g._novo.checklist.push({ t: txt, feito: false }); }
  else { const i = S.itens.find((x) => x.id === fichaAtual); i.checklist.push({ t: txt, feito: false }); registrar(i, `Passo adicionado: ${txt}`); salvar(); }
  const ul = $('.ck', g); const n = ul.children.length;
  ul.insertAdjacentHTML('beforeend', `<li><label><input type="checkbox" data-ck="${n}"><span>${esc(txt)}</span></label></li>`);
  inp.value = ''; inp.focus();
  if (!g._novo) atualizarFundo();
}
function atualizarFundo() { const r = rota(); if (r.nome === 'quadro') renderQuadro(r.sub); if (r.nome === 'radar') renderRadar(); }

document.addEventListener('change', (e) => {
  const f = e.target.closest('[data-ficha]');
  if (!f) return;
  const g = $('[data-gaveta]');
  const el = e.target;
  if (g._novo) { if (el.name) g._novo[el.name] = el.name === 'prazo' ? (el.value ? new Date(el.value).toISOString() : null) : el.value; if ('ck' in el.dataset) g._novo.checklist[+el.dataset.ck].feito = el.checked; return; }
  const i = S.itens.find((x) => x.id === fichaAtual);
  if (!i) return;
  let mudou = false;
  if ('ck' in el.dataset) { const c = i.checklist[+el.dataset.ck]; c.feito = el.checked; registrar(i, `${c.feito ? 'Concluído' : 'Reaberto'}: ${c.t}`); mudou = true; }
  else if (el.name) mudou = mudarCampo(i, el.name, el.value);
  if (!mudou) return;
  salvar(); atualizarFundo();
  if (el.name === 'titulo') $('#gaveta-h').textContent = i.titulo;
  const ol = $('.hist ol'); if (ol) ol.insertAdjacentHTML('afterbegin', `<li><time>${fmtCurta.format(agora())}</time><span>${esc(i.historico.at(-1).texto)}</span></li>`);
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'nova-ideia' && e.target.value.trim()) { $('#nova-ideia-erro').hidden = true; e.target.removeAttribute('aria-invalid'); }
  if (e.target.id === 'f-titulo' && e.target.value.trim()) { $('#f-titulo-erro').hidden = true; e.target.removeAttribute('aria-invalid'); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'f-ck' && e.key === 'Enter') { e.preventDefault(); return addPasso(); }
  if (e.target.id === 'nova-ideia' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('[data-captura]').requestSubmit(); return; }
  if (e.key === 'Escape') { const pp = $('#prazo-pop'); if (pp && !pp.hidden) { abrirCal(false); $('[data-prazo-abrir]').focus(); return; } if (!$('#relogio-painel').hidden) { abrirRelogio(false); $('[data-relogio-btn]').focus(); return; } return fecharFicha(); }
  const digitando = e.target.closest('input, textarea, select, [contenteditable]');
  if (digitando || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); novaDemanda(); }
  if (e.key === 't' || e.key === 'T') { e.preventDefault(); trocarTema(); }
  if (e.key === 'i' || e.key === 'I') { e.preventDefault(); if (rota().nome !== 'ideias') location.hash = '#/ideias'; setTimeout(() => $('#nova-ideia').focus(), 60); }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.matches('[data-captura]')) {
    const ta = $('#nova-ideia'); const err = $('#nova-ideia-erro');
    const txt = ta.value.trim();
    if (!txt) { err.hidden = false; ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
    err.hidden = true; ta.removeAttribute('aria-invalid');
    S.seqIdeia = (S.seqIdeia || S.ideias.length) + 1;
    S.ideias.push({ id: `ID-${S.seqIdeia}`, texto: txt, criado: new Date(agora()).toISOString(), promovida: null });
    salvar(); ta.value = ''; ui.ideias = 'abertas'; renderIdeias(); ta.focus();
    avisar('Ideia guardada fora dos projetos.');
  }
  if (e.target.matches('[data-ficha]')) {
    const g = $('[data-gaveta]'); const n = g._novo; if (!n) return;
    n.titulo = $('#f-titulo').value.trim();
    if (!n.titulo) { $('#f-titulo-erro').hidden = false; $('#f-titulo').setAttribute('aria-invalid', 'true'); $('#f-titulo').focus(); return; }
    n.descricao = $('#f-desc').value;
    const { id, historico, ...dados } = n;
    const item = criarItem(dados);
    salvar(); fecharFicha(); atualizarFundo();
    avisar(`${item.id} criada em ${proj(item.projeto).curto}.`, { rotulo: 'Abrir a ficha', fn: () => abrirFicha(item.id) });
  }
});

/* ---------- tooltip próprio (no lugar do title nativo) ---------- */
const dica = document.createElement('div'); dica.className = 'dica'; dica.setAttribute('aria-hidden', 'true'); document.body.append(dica);
let dicaT; let dicaAlvo = null;
function mostrarDica(el, atraso) {
  clearTimeout(dicaT); dicaAlvo = el;
  dicaT = setTimeout(() => {
    if (dicaAlvo !== el || !document.contains(el)) return;
    dica.textContent = el.dataset.tip; dica.classList.add('is-on');
    const r = el.getBoundingClientRect(); const w = dica.offsetWidth; const h = dica.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    const acima = r.top - h - 8 > 64;
    dica.style.left = `${x}px`; dica.style.top = `${acima ? r.top - h - 8 : r.bottom + 8}px`;
  }, atraso);
}
function esconderDica() { clearTimeout(dicaT); dicaAlvo = null; dica.classList.remove('is-on'); }
document.addEventListener('pointerover', (e) => { const el = e.target.closest('[data-tip]'); if (el && el !== dicaAlvo) mostrarDica(el, 350); else if (!el && dicaAlvo) esconderDica(); });
document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el && e.target.matches(':focus-visible')) mostrarDica(el, 0); else esconderDica(); });
['focusout', 'pointerdown', 'scroll'].forEach((t) => document.addEventListener(t, esconderDica, true));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') esconderDica(); }, true);

/* ---------- tema: claro ↔ escuro ---------- */
const TEMAS = { light: ['claro', 'dark', 'escuro'], dark: ['escuro', 'light', 'claro'] };
function aplicarTema(t) {
  const r = document.documentElement;
  r.dataset.temaEscolha = t; r.dataset.theme = t;
  const [nome, , proxNome] = TEMAS[t];
  $('[data-tema]').setAttribute('aria-label', `Tema: ${nome}. Trocar para ${proxNome}`);
  $('[data-tema]').dataset.tip = `Tema ${nome}`;
}
function trocarTema() {
  const prox = TEMAS[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'][1];
  gravarUi('tema', prox); aplicarTema(prox); avisar(`Tema ${TEMAS[prox][0]}.`);
}
aplicarTema(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/* ---------- entrada da hero: uma vez por visita ---------- */
function entrada() {
  const hero = $('[data-enter]'); const h1 = $('h1', hero);
  if (reduz.matches || rota().nome !== 'radar' || document.documentElement.dataset.motion === 'off') { document.documentElement.classList.add('m-enter-done'); return; }
  const original = h1.textContent;
  h1.setAttribute('aria-label', original);
  h1.innerHTML = original.split(' ').map((w, n) => `<span class="palavra" aria-hidden="true"><span style="--w:${n}">${esc(w)}</span></span>`).join(' ');
  hero.classList.add('is-in');
  document.documentElement.classList.add('m-enter-done');
  setTimeout(() => { hero.classList.remove('is-in'); h1.textContent = original; h1.removeAttribute('aria-label'); }, 1500);
}

reduz.addEventListener?.('change', () => render());
navegar();
entrada();
