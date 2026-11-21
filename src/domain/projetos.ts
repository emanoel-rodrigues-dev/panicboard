// Cadastro de projetos: criar, editar e arquivar. Funções puras sobre o Estado.
import type { Estado, Projeto } from './tipos';

/** cores que se pode escolher; a tinta é a cor do texto sobre a cor (contraste conferido) */
export const CORES: { nome: string; cor: string; tinta: string }[] = [
  { nome: 'Verde', cor: '#61b771', tinta: '#0e2413' },
  { nome: 'Azul', cor: '#3b6fa3', tinta: '#ffffff' },
  { nome: 'Laranja', cor: '#ff8000', tinta: '#241200' },
  { nome: 'Roxo', cor: '#8b5cf6', tinta: '#ffffff' },
  { nome: 'Rosa', cor: '#d6336c', tinta: '#ffffff' },
  { nome: 'Amarelo', cor: '#f2c12e', tinta: '#2a2000' },
  { nome: 'Turquesa', cor: '#1c9c9c', tinta: '#061f1f' },
  { nome: 'Grafite', cor: '#5c6370', tinta: '#ffffff' },
];

/** cor e tinta de uma cor da lista, pelo nome */
export function corDaLista(nome: string): { cor: string; tinta: string } {
  const { cor, tinta } = CORES.find((c) => c.nome === nome) ?? CORES[0];
  return { cor, tinta };
}
/** para o que não é de nenhum projeto (projeto removido, lugar vazio do radar) */
export const COR_NEUTRA = corDaLista('Grafite');

const REMOVIDO: Projeto = { id: '', sigla: '?', nome: 'Projeto removido', curto: 'Removido', ...COR_NEUTRA };

/** projeto pelo id; se não existir mais, um marcador neutro em vez de quebrar a tela */
export const proj = (lista: Projeto[], id: string): Projeto => lista.find((p) => p.id === id) ?? { ...REMOVIDO, id };

export const ativos = (lista: Projeto[]) => lista.filter((p) => !p.arquivado);

export interface DadosProjeto { nome: string; curto: string; sigla: string; cor: string }
export type ErrosProjeto = Partial<Record<'nome' | 'sigla' | 'cor', string>>;

/** "#abc" ou "#aabbcc" (com ou sem #) em "#aabbcc"; null se não for uma cor */
export function lerHex(v: string): string | null {
  const h = v.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) return `#${[...h].map((c) => c + c).join('')}`;
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null;
}

const luz = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** texto claro ou escuro, o que tiver mais contraste sobre a cor */
export function tintaPara(cor: string): string {
  const claro = '#ffffff', escuro = '#16181d';
  return contraste(cor, claro) >= contraste(cor, escuro) ? claro : escuro;
}

export const limparSigla = (s: string) => s.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);

/** sugestão de sigla a partir do nome: iniciais das duas primeiras palavras, ou as duas primeiras letras */
export function sugerirSigla(nome: string): string {
  const palavras = nome.normalize('NFD').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (palavras.length >= 2) return (palavras[0][0] + palavras[1][0]).toUpperCase();
  return limparSigla(palavras[0] ?? '').slice(0, 2);
}

/** nome curto: o nome inteiro se couber, senão a primeira palavra */
const curtoDe = (nome: string) => (nome.length <= 16 ? nome : nome.split(/[\s/&]+/)[0]);

export function validarProjeto(lista: Projeto[], d: DadosProjeto, id?: string): ErrosProjeto {
  const e: ErrosProjeto = {};
  if (!d.nome.trim()) e.nome = 'Escreva o nome do projeto.';
  const sigla = limparSigla(d.sigla);
  if (!sigla) e.sigla = 'A sigla precisa de 1 a 3 letras ou números.';
  else if (lista.some((p) => p.id !== id && p.sigla === sigla)) e.sigla = `A sigla ${sigla} já é de outro projeto.`;
  if (!lerHex(d.cor)) e.cor = 'Escreva a cor no formato #2f9e44.';
  return e;
}

function normalizar(d: DadosProjeto): Omit<Projeto, 'id'> {
  const cor = lerHex(d.cor) ?? CORES[0].cor;
  const nome = d.nome.trim();
  // cores da lista têm a tinta já escolhida; as outras ganham a de maior contraste
  const tinta = CORES.find((c) => c.cor === cor)?.tinta ?? tintaPara(cor);
  return { nome, curto: d.curto.trim() || curtoDe(nome), sigla: limparSigla(d.sigla), cor, tinta };
}

function novoId(lista: Projeto[], nome: string): string {
  const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'projeto';
  let id = base;
  for (let n = 2; lista.some((p) => p.id === id) || id === 'todos'; n++) id = `${base}-${n}`;
  return id;
}

/** Cria o projeto. Devolve null se os dados não passam na validação. */
export function criarProjeto(S: Estado, d: DadosProjeto): [Estado, Projeto] | null {
  if (Object.keys(validarProjeto(S.projetos, d)).length) return null;
  const p: Projeto = { id: novoId(S.projetos, d.nome), ...normalizar(d) };
  return [{ ...S, projetos: [...S.projetos, p] }, p];
}

/** Edita nome, nome curto, sigla e cor. As demandas já criadas mantêm o código antigo (ex.: AB-3). */
export function editarProjeto(S: Estado, id: string, d: DadosProjeto): Estado | null {
  const atual = S.projetos.find((p) => p.id === id);
  if (!atual || Object.keys(validarProjeto(S.projetos, d, id)).length) return null;
  return { ...S, projetos: S.projetos.map((p) => (p.id === id ? { ...p, ...normalizar(d) } : p)) };
}

export function arquivarProjeto(S: Estado, id: string, arquivado: boolean): Estado {
  return { ...S, projetos: S.projetos.map((p) => (p.id === id ? { ...p, arquivado } : p)) };
}

/** Estados da versão 1 não guardavam os projetos: monta um por projeto citado nas demandas. */
export function projetosDasDemandas(itens: { id: string; projeto: string }[], seq: Record<string, number>): Projeto[] {
  const ids = [...new Set([...itens.map((i) => i.projeto), ...Object.keys(seq)])];
  return ids.map((id, n) => {
    const sigla = itens.find((i) => i.projeto === id)?.id.split('-')[0] ?? limparSigla(id);
    const nome = id.charAt(0).toUpperCase() + id.slice(1);
    const c = CORES[n % CORES.length];
    return { id, sigla, nome, curto: nome, cor: c.cor, tinta: c.tinta };
  });
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
export const rgbParaHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/**
 * Cores principais de uma imagem (pixels RGBA, como o getImageData devolve).
 * Agrupa as cores parecidas, ignora o transparente e devolve as mais frequentes,
 * sem repetir tons quase iguais. Quase branco fica de fora (é fundo e sumiria na tela); quase preto vai para o fim.
 */
export function coresDaImagem(px: Uint8ClampedArray, max = 5): string[] {
  const grupos = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    if (Math.min(r, g, b) > 235) continue;
    // agrupa pelos 4 bits mais altos de cada canal: cores que só diferem nos tons finos caem no mesmo grupo
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const x = grupos.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    x.n++; x.r += r; x.g += g; x.b += b;
    grupos.set(k, x);
  }
  const neutro = (c: { r: number; g: number; b: number }) => { const m = Math.max(c.r, c.g, c.b), mi = Math.min(c.r, c.g, c.b); return mi > 235 || m < 20; };
  const medias = [...grupos.values()].map((x) => ({ n: x.n, r: x.r / x.n, g: x.g / x.n, b: x.b / x.n }))
    .sort((a, b) => Number(neutro(a)) - Number(neutro(b)) || b.n - a.n);
  const escolhidas: typeof medias = [];
  for (const c of medias) {
    if (escolhidas.length >= max) break;
    if (escolhidas.every((e) => Math.hypot(e.r - c.r, e.g - c.g, e.b - c.b) > 60)) escolhidas.push(c);
  }
  return escolhidas.map((c) => rgbParaHex(c.r, c.g, c.b));
}
