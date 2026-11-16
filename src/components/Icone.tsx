import type { CSSProperties } from 'react';
import type { Projeto } from '../domain/tipos';

const ICO: Record<string, string> = {
  atrasado: '<path d="M12 3.5 21 19H3z"/><path d="M12 10v4M12 16.6v.4"/>',
  prazo_apertado: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9.5 2.8h5"/>',
  abandonado: '<path d="M5 19c2-6 4-9 7-9s5 3 7 9"/><path d="M12 10V4M8 4h8"/>',
  em_dia: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.7 2.7L16.2 9.5"/>',
  normal: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
  feito: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  seta: '<path d="M5 12h13M13 6.5 18.5 12 13 17.5"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  alta: '<path d="M6 15l6-6 6 6"/>',
  media: '<path d="M6 12h12"/>',
  baixa: '<path d="M6 9l6 6 6-6"/>',
  lixo: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};

/** Ícone de traço. Os desenhos são constantes do código, nunca texto do usuário. */
export function Ico({ n, c = '' }: { n: string; c?: string }) {
  return <svg className={`ico ${c}`.trim()} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICO[n] ?? ICO.normal }} />;
}

/** variáveis CSS (--pc, --pt, --i) num style tipado */
export const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function TagProjeto({ p }: { p: Projeto }) {
  return <span className="ptag" style={vars({ '--pc': p.cor })}><span className="ptag__dot" />{p.curto}</span>;
}
