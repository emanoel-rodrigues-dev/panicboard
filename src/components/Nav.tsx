import { useState } from 'react';
import { useApp } from '../app/contexto';
import { useFecharAoSair } from '../app/hooks';
import { fmtData } from '../domain/tempo';

const MARCA = <svg className="mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18a9 9 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><circle cx="12" cy="18" r="2.6" fill="#ffd43b" /></svg>;
export const Marca = () => MARCA;

export type Tema = 'light' | 'dark';
const NOMES: Record<Tema, [string, Tema, string]> = { light: ['claro', 'dark', 'escuro'], dark: ['escuro', 'light', 'claro'] };

export function rotuloRelogio(h: number) {
  if (!h) return 'Agora';
  return `+${h >= 24 && h % 24 === 0 ? `${h / 24} ${h === 24 ? 'dia' : 'dias'}` : `${h} h`}`;
}

export function Nav({ tema, onTema }: { tema: Tema; onTema: () => void }) {
  const { rota, t, deslocamentoH, avancarRelogio, restaurarExemplo, novaDemanda } = useApp();
  const [relogio, setRelogio] = useState(false);
  const [nome, , proxNome] = NOMES[tema];

  useFecharAoSair(relogio, setRelogio, '.relogio', '[data-relogio-btn]');

  const avancar = (h: number) => { setRelogio(false); avancarRelogio(h); };
  const link = (r: string, href: string, texto: string) => <a href={href} data-rota={r} aria-current={rota.nome === r ? 'page' : undefined}>{texto}</a>;

  return (
    <header className="nav">
      <div className="wrap nav__in">
        <a className="skip-link" href="#top">Pular para o conteúdo</a>
        <a className="logo" href="#/" aria-label="PanicBoard, ir para o radar">{MARCA}<span>PanicBoard</span></a>
        <nav className="nav__links" aria-label="Telas">
          {link('radar', '#/', 'Radar')}{link('quadro', '#/quadro', 'Quadro')}{link('ideias', '#/ideias', 'Ideias')}
        </nav>
        <div className="nav__right">
          <button className="tema" type="button" data-tema="" aria-label={`Tema: ${nome}. Trocar para ${proxNome}`} data-tip={`Tema ${nome}`} onClick={onTema}>
            <svg className="ico ico--claro" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>
            <svg className="ico ico--escuro" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" /></svg>
          </button>
          <div className="relogio">
            <button className="btn btn--secondary relogio__btn" type="button" aria-expanded={relogio} aria-controls="relogio-painel" data-relogio-btn="" onClick={() => setRelogio((v) => !v)}>
              <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
              <span data-relogio-rotulo="">{rotuloRelogio(deslocamentoH)}</span>
            </button>
            <div className="relogio__painel" id="relogio-painel" hidden={!relogio}>
              <h2 className="relogio__tit">Relógio simulado</h2>
              <p className="relogio__agora" data-relogio-data="">{fmtData.format(t)}</p>
              <p className="relogio__nota">Avance o tempo para ver as regras do motor mudarem sem esperar 48 h.</p>
              <div className="relogio__grade">
                {([[6, 'Avançar 6 h'], [24, 'Avançar 1 dia'], [72, 'Avançar 3 dias'], [0, 'Voltar para agora']] as const).map(([h, r]) => (
                  <button key={h} className="btn btn--secondary" type="button" data-avancar={h} onClick={() => avancar(h)}>{r}</button>
                ))}
              </div>
              <button className="link relogio__reset" type="button" data-restaurar="" onClick={() => { setRelogio(false); restaurarExemplo(); }}>Restaurar dados de exemplo</button>
            </div>
          </div>
          <button className="btn btn--primary nav__cta" type="button" data-nova="" onClick={() => novaDemanda()}>
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <span>Nova demanda</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export const proximoTema = (t: Tema): Tema => NOMES[t][1];
export const nomeTema = (t: Tema) => NOMES[t][0];
