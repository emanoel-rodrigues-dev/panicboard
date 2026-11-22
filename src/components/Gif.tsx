import { useEffect, useState } from 'react';
import { useApp } from '../app/contexto';
import { nomeCurto } from '../domain/motor';
import type { Reacao } from '../domain/tipos';

interface Props { r: Reacao; chave: string; tarja?: boolean; classe?: string; tocar?: boolean }

/** tempo do fade de entrada (igual ao do CSS de .gif img) */
const FADE_MS = 320;

/** GIF da reação com tarja, crédito, still no movimento reduzido e fallback se não carregar. */
export function Gif({ r, chave, tarja = true, classe = '', tocar }: Props) {
  const { parado, tocando, alternarGif } = useApp();
  const [falha, setFalha] = useState<string | null>(null);
  // Só mostra a imagem depois de baixada inteira (nunca pela metade): até lá fica o fundo do cartão.
  // Ao trocar de imagem (parada → animada), a anterior fica embaixo até a nova estar pronta e as duas se cruzam.
  const [pronta, setPronta] = useState<string | null>(null);
  const [anterior, setAnterior] = useState<string | null>(null);
  const ativo = tocar ?? (!parado || tocando.has(chave));
  // WebP animado do GIPHY: mesma imagem, 2 a 4 vezes mais leve que o GIF
  const animado = r.gif.replace(/\.gif$/, '.webp');
  const alvo = ativo ? animado : r.still;
  const carregou = pronta === alvo;
  useEffect(() => {
    if (!carregou) return;
    const t = window.setTimeout(() => setAnterior(alvo), FADE_MS);
    return () => window.clearTimeout(t);
  }, [carregou, alvo]);
  const quem = nomeCurto(r);
  return (
    <div className={['gif', classe, falha === r.id && 'is-falha'].filter(Boolean).join(' ')} data-gif={chave}>
      {anterior && anterior !== alvo && <img className="gif__anterior" src={anterior} alt="" aria-hidden="true" />}
      <img className={carregou ? 'is-pronta' : undefined} src={alvo} data-anim={animado} data-still={r.still} alt={`${r.personagem}, ${r.obra}`} decoding="async" loading="lazy" onLoad={() => setPronta(alvo)} onError={() => setFalha(r.id)} />
      <div className="gif__falha" aria-hidden="true"><strong>{quem}</strong><span>{r.obra}</span></div>
      {tarja && <p className="tarja"><span className="tarja__quem">{quem}</span><span className="tarja__fala">{r.fala_curta_pt}</span></p>}
      <a className="gif__credito" href={r.pagina} target="_blank" rel="noopener">via GIPHY</a>
      {parado && <button className="gif__tocar" type="button" data-tocar={chave} aria-pressed={ativo} onClick={() => alternarGif(chave)}>{ativo ? 'Parar GIF' : 'Tocar GIF'}</button>}
    </div>
  );
}
