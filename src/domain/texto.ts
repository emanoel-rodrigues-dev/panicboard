export type Trecho = { tipo: 'texto'; valor: string } | { tipo: 'tag'; valor: string };

const TAG = /#([\p{L}\d_-]+)/gu;

/** Separa o texto cru em trechos de texto e #tags (sem passar por HTML). */
export function trechosComTags(texto: string): Trecho[] {
  const out: Trecho[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(TAG)) {
    if (m.index > ultimo) out.push({ tipo: 'texto', valor: texto.slice(ultimo, m.index) });
    out.push({ tipo: 'tag', valor: m[1] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) out.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  return out;
}

/** Título de uma demanda promovida: sem #tags, espaços normalizados, até 90 caracteres. */
export function tituloDaIdeia(texto: string): string {
  const limpo = texto.replace(TAG, '').replace(/\s+/g, ' ').trim();
  return limpo.length > 90 ? `${limpo.slice(0, 88).trim()}…` : limpo;
}
