import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useApp } from '../app/contexto';
import { soImagens } from '../app/imagem';
import type { Imagem } from '../domain/tipos';
import { Ico } from './Icone';

/** endereço da imagem no armazém (carrega de forma assíncrona) */
function useUrl(id: string) {
  const { imagens } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    imagens.url(id).then((u) => { if (vivo) { setUrl(u); setFalhou(false); } }).catch(() => { if (vivo) setFalhou(true); });
    return () => { vivo = false; };
  }, [id, imagens]);
  return { url, falhou };
}

function Miniatura({ m, onAbrir, onRemover }: { m: Imagem; onAbrir: () => void; onRemover: () => void }) {
  const { url, falhou } = useUrl(m.id);
  return (
    <li className="img">
      <button className="img__abrir" type="button" data-imagem-abrir={m.id} aria-label={`Ver a imagem ${m.nome} em tamanho maior`} onClick={onAbrir}>
        {url ? <img src={url} alt={m.nome} width={m.largura} height={m.altura} loading="lazy" /> : <span className="img__espera">{falhou ? 'Imagem indisponível' : 'Carregando…'}</span>}
      </button>
      <button className="img__remover" type="button" data-imagem-remover={m.id} aria-label={`Remover a imagem ${m.nome}`} data-tip="Remover" onClick={onRemover}><Ico nome="lixo" /></button>
    </li>
  );
}

/** imagem em tamanho grande: <dialog> modal (prende o foco, Esc fecha só ela e devolve o foco) */
function Ampliada({ m, onFechar }: { m: Imagem; onFechar: () => void }) {
  const { url, falhou } = useUrl(m.id);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  // o Esc fecha só a imagem; não pode subir para o atalho que fecha a ficha
  const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); } };
  return (
    <dialog ref={ref} className="img__grande" aria-label={m.nome} onClose={onFechar} onKeyDown={tecla}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <button className="img__fechar" type="button" autoFocus aria-label="Fechar a imagem" onClick={onFechar}><Ico nome="fechar" /></button>
      {url ? <img src={url} alt={m.nome} /> : <p>{falhou ? 'Imagem indisponível.' : 'Carregando…'}</p>}
      <p className="img__legenda">{m.nome}</p>
    </dialog>
  );
}

interface Props {
  lista: Imagem[];
  /** arrastando algo sobre a ficha */
  arrastando: boolean;
  /** quantas imagens estão sendo preparadas */
  ocupado: number;
  onAdicionar: (arquivos: File[]) => void;
  onRemover: (m: Imagem) => void;
}

/** Seção de imagens da ficha: colar (Cmd+V), arrastar ou escolher o arquivo. */
export function Imagens({ lista, arrastando, ocupado, onAdicionar, onRemover }: Props) {
  const [aberta, setAberta] = useState<Imagem | null>(null);
  const escolher = useRef<HTMLInputElement>(null);
  return (
    <section className="campo imgs" aria-labelledby="imgs-h">
      <h3 className="campo__rot" id="imgs-h">Imagens</h3>
      {lista.length > 0 && (
        <ul className="imgs__lista">{lista.map((m) => <Miniatura key={m.id} m={m} onAbrir={() => setAberta(m)} onRemover={() => onRemover(m)} />)}</ul>
      )}
      <div className={`imgs__zona${arrastando ? ' is-arrastando' : ''}`} data-imagens-zona="">
        <p>{arrastando ? 'Solte para anexar' : <>Cole um print com <kbd>⌘</kbd> <kbd>V</kbd>, arraste para cá ou</>}</p>
        <button className="btn btn--secondary" type="button" data-imagens-escolher="" onClick={() => escolher.current?.click()}>Escolher imagem</button>
        <input ref={escolher} type="file" accept="image/*" multiple hidden tabIndex={-1} aria-label="Escolher imagens do computador" data-imagens-arquivo=""
          onChange={(e) => { onAdicionar(soImagens(e.target.files)); e.target.value = ''; }} />
      </div>
      <p className="imgs__estado" role="status">{ocupado > 0 ? (ocupado === 1 ? 'Preparando a imagem…' : `Preparando ${ocupado} imagens…`) : ''}</p>
      {aberta && <Ampliada m={aberta} onFechar={() => setAberta(null)} />}
    </section>
  );
}
