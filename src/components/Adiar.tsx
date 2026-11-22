import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useApp } from '../app/contexto';
import { adiarPrazo, mudarCampo } from '../domain/acoes';
import { fmtCurta } from '../domain/tempo';
import type { Item } from '../domain/tipos';
import { Ico } from './Icone';

const OPCOES: [number, string][] = [[1, '+1 dia'], [7, '+1 semana']];

/** Botão de adiar o prazo no cartão, com um menu curto (+1 dia, +1 semana). */
export function Adiar({ i }: { i: Item }) {
  const { S, t, atualizar, avisar, focarDepois } = useApp();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = `[data-adiar="${i.id}"]`;

  useEffect(() => {
    if (!aberto) return;
    caixa.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  const adiar = (dias: number) => {
    const antes = i.prazo!;
    const novo = adiarPrazo(S, i.id, dias, t).itens.find((x) => x.id === i.id)?.prazo;
    setAberto(false);
    if (!novo || novo === antes) return;
    atualizar((s) => adiarPrazo(s, i.id, dias, t));
    // o cartão pode mudar de coluna e ser montado de novo: o foco volta para o botão dele
    focarDepois([gatilho, `[data-abrir="${i.id}"]`]);
    avisar(`${i.id} adiada para ${fmtCurta.format(Date.parse(novo))}.`, {
      rotulo: 'Desfazer',
      fn: () => { atualizar((s) => mudarCampo(s, i.id, 'prazo', antes, t)); avisar(`${i.id} voltou para o prazo de antes.`); },
    });
  };

  const tecla = (e: KeyboardEvent) => {
    if (!aberto) return;
    const itens = [...(caixa.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const n = itens.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAberto(false); caixa.current?.querySelector<HTMLElement>(gatilho)?.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); itens[(n + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); itens[e.key === 'Home' ? 0 : itens.length - 1]?.focus(); }
    else if (e.key === 'Tab') setAberto(false);
  };

  return (
    <div className="adiar" ref={caixa} onKeyDown={tecla}>
      <button className="cartao__adiar" type="button" data-adiar={i.id} aria-haspopup="menu" aria-expanded={aberto} aria-controls={`adiar-${i.id}`}
        aria-label={`Adiar o prazo de ${i.id}`} data-tip="Adiar o prazo" onClick={() => setAberto((v) => !v)}>
        <Ico nome="calendario" />
      </button>
      {aberto && (
        <div className="adiar__menu" id={`adiar-${i.id}`} role="menu" aria-label={`Adiar o prazo de ${i.id}`}>
          {OPCOES.map(([d, r]) => <button key={d} className="adiar__op" type="button" role="menuitem" tabIndex={-1} data-adiar-dias={d} onClick={() => adiar(d)}>{r}</button>)}
        </div>
      )}
    </div>
  );
}
