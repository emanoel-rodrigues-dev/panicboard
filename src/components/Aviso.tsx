import type { AcaoAviso } from '../app/contexto';

/** Aviso curto no rodapé da tela, com uma ação opcional (Desfazer, Abrir a ficha). */
export function Aviso({ msg, acao, on, onAcao }: { msg: string; acao?: AcaoAviso; on: boolean; onAcao: () => void }) {
  return (
    <div className={on ? 'aviso is-on' : 'aviso'} role="status" aria-live="polite" data-aviso="">
      {msg && <span>{msg}</span>}
      {acao && <button type="button" className="link" data-aviso-acao="" onClick={onAcao}>{acao.rotulo}</button>}
    </div>
  );
}
