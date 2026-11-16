import { useState } from 'react';
import { useApp } from '../app/contexto';
import { nomeCurto } from '../domain/motor';
import type { Reacao } from '../domain/tipos';

interface Props { r: Reacao; chave: string; tarja?: boolean; classe?: string; tocar?: boolean }

/** GIF da reação com tarja, crédito, still no movimento reduzido e fallback se não carregar. */
export function Gif({ r, chave, tarja = true, classe = '', tocar }: Props) {
  const { parado, tocando, alternarGif } = useApp();
  const [falha, setFalha] = useState<string | null>(null);
  const ativo = tocar ?? (!parado || tocando.has(chave));
  const quem = nomeCurto(r);
  return (
    <div className={['gif', classe, falha === r.id && 'is-falha'].filter(Boolean).join(' ')} data-gif={chave}>
      <img src={ativo ? r.gif : r.still} data-anim={r.gif} data-still={r.still} alt={`${r.personagem}, ${r.obra}`} decoding="async" loading="lazy" onError={() => setFalha(r.id)} />
      <div className="gif__falha" aria-hidden="true"><strong>{quem}</strong><span>{r.obra}</span></div>
      {tarja && <p className="tarja"><span className="tarja__quem">{quem}</span><span className="tarja__fala">{r.fala_curta_pt}</span></p>}
      <a className="gif__credito" href={r.pagina} target="_blank" rel="noopener">via GIPHY</a>
      {parado && <button className="gif__tocar" type="button" data-tocar={chave} aria-pressed={ativo} onClick={() => alternarGif(chave)}>{ativo ? 'Parar GIF' : 'Tocar GIF'}</button>}
    </div>
  );
}
