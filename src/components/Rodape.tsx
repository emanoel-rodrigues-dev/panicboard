import { useApp } from '../app/contexto';
import type { Conta } from '../App';
import type { Avisos } from '../app/notificacoes';
import { Marca } from './Nav';

export function Rodape({ conta, avisos, onAvisos }: { conta?: Conta; avisos: Avisos; onAvisos: () => void }) {
  return (
    <footer className="closing">
      <div className="wrap closing__in">
        <div className="closing__marca">
          <a className="logo" href="#/"><Marca /><span>PanicBoard</span></a>
          {conta
            ? <p>{`Salvo na conta ${conta.email}. `}<button className="link" type="button" data-sair="" onClick={conta.sair}>Sair</button></p>
            : <p>Tudo fica salvo neste navegador.</p>}
          {avisos.suporte && (avisos.bloqueado && !avisos.ligado
            ? <p>Notificações bloqueadas neste navegador. Libere nas configurações do site para receber os avisos de prazo.</p>
            : <p><button className="link" type="button" data-avisos="" aria-pressed={avisos.ligado} onClick={onAvisos}>{avisos.ligado ? 'Avisos de prazo ligados · Desligar' : 'Avisar quando um prazo apertar'}</button></p>)}
        </div>
        <div className="closing__col">
          <h3>Telas</h3>
          <a className="flink" href="#/">Radar</a><a className="flink" href="#/quadro">Quadro</a><a className="flink" href="#/ideias">Ideias</a>
        </div>
        <div className="closing__col">
          <h3>Atalhos</h3>
          <p><kbd>N</kbd> nova demanda</p><p><kbd>I</kbd> nova ideia</p><p><kbd>T</kbd> troca o tema</p><p><kbd>Esc</kbd> fecha a ficha</p>
        </div>
        <p className="closing__legal">PanicBoard 2026 · GIFs via GIPHY, os personagens pertencem às suas obras</p>
      </div>
    </footer>
  );
}

export function Tabbar() {
  const { rota, novaDemanda } = useApp();
  const atual = (r: string) => (rota.nome === r ? 'page' : undefined);
  return (
    <nav className="tabbar" aria-label="Telas">
      <a href="#/" data-rota="radar" aria-current={atual('radar')}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 17a8.5 8.5 0 0 1 17 0" /><path d="M12 17l4-5" /></svg><span>Radar</span></a>
      <a href="#/quadro" data-rota="quadro" aria-current={atual('quadro')}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4.5" width="16" height="15" rx="2.5" /><path d="M9.5 4.5v15M15 4.5v9" /></svg><span>Quadro</span></a>
      <a href="#/ideias" data-rota="ideias" aria-current={atual('ideias')}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" /></svg><span>Ideias</span></a>
      <button type="button" data-nova="" onClick={() => novaDemanda()}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>Nova</span></button>
    </nav>
  );
}
