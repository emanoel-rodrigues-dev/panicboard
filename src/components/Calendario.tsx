import { useEffect, useState } from 'react';
import { useApp } from '../app/contexto';
import { fmtMes, fmtRot, p2 } from '../domain/tempo';
import { Ico } from './Icone';

interface Props {
  /** valor atual "AAAA-MM-DDTHH:MM" ou '' */
  valor: string;
  /** "agora" do app (com o relógio simulado) */
  t: number;
  /** escolhe a data; fechar=true fecha o calendário */
  onEscolher: (d: Date | null, fechar: boolean) => void;
}

const ATALHOS: [string, string][] = [['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['3d', 'Em 3 dias'], ['seg', 'Próxima segunda'], ['limpar', 'Sem prazo']];
const HORAS = Array.from({ length: 16 }, (_, n) => `${p2(7 + n)}:00`);
/** "15:27" ou "15h27" → [15, 27]; null se não for um horário válido */
const lerHora = (txt: string): [number, number] | null => {
  const m = /^(\d{1,2})\s*[:h]\s*(\d{2})$/.exec(txt.trim());
  return m && +m[1] < 24 && +m[2] < 60 ? [+m[1], +m[2]] : null;
};
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Calendário próprio do prazo: atalhos, mês em grade e horários em botões. */
export function Calendario({ valor, t, onEscolher }: Props) {
  const { reduz } = useApp();
  const sel = valor ? new Date(valor) : null;
  const hoje = new Date(t);
  const base = sel || hoje;
  const [mes, setMes] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  useEffect(() => {
    document.querySelector<HTMLElement>('#prazo-pop .cal__dia[aria-pressed="true"], #prazo-pop .cal__dia.is-hoje')?.focus({ preventScroll: true });
    document.getElementById('prazo-pop')?.scrollIntoView({ block: 'nearest', behavior: reduz ? 'instant' : 'smooth' });
  }, [reduz]);

  const ini = new Date(mes); ini.setDate(1 - ini.getDay());
  const dias = Array.from({ length: 42 }, (_, n) => { const d = new Date(ini); d.setDate(ini.getDate() + n); return d; });
  const mesmo = (a: Date | null, b: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
  const hora = sel ? `${p2(sel.getHours())}:${p2(sel.getMinutes())}` : '18:00';
  const agora = `${p2(hoje.getHours())}:00`;
  const [outra, setOutra] = useState(() => (sel && !HORAS.includes(hora) ? hora : ''));
  const [erroHora, setErroHora] = useState(false);

  const atalho = (k: string) => {
    if (k === 'limpar') return onEscolher(null, true);
    const b = new Date(t); b.setHours(18, 0, 0, 0);
    if (k === 'amanha') b.setDate(b.getDate() + 1);
    if (k === '3d') b.setDate(b.getDate() + 3);
    // dias até a próxima segunda (getDay 1); numa segunda, a da semana que vem
    if (k === 'seg') b.setDate(b.getDate() + (((8 - b.getDay()) % 7) || 7));
    onEscolher(b, true);
  };
  const dia = (d: Date) => {
    const [hh, mm] = valor ? valor.slice(11, 16).split(':') : ['18', '00'];
    onEscolher(new Date(d.getFullYear(), d.getMonth(), d.getDate(), +hh, +mm), false);
  };
  const aplicarHora = (hh: number, mm: number) => {
    const b = valor ? new Date(valor) : new Date(t);
    b.setHours(hh, mm, 0, 0);
    onEscolher(b, true);
  };
  const aplicarOutra = () => {
    const h = lerHora(outra);
    if (!h) return setErroHora(true);
    aplicarHora(h[0], h[1]);
  };

  return (
    <>
      <div className="cal__atalhos">{ATALHOS.map(([k, r]) => <button key={k} type="button" className="chip" data-prazo-atalho={k} onClick={() => atalho(k)}>{r}</button>)}</div>
      <div className="cal__cab">
        <button type="button" className="cal__nav" data-prazo-mes="-1" aria-label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><Ico nome="seta" classe="ico--vira" /></button>
        <strong>{fmtMes.format(mes)}</strong>
        <button type="button" className="cal__nav" data-prazo-mes="1" aria-label="Próximo mês" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><Ico nome="seta" /></button>
      </div>
      <div className="cal__grade">
        {SEMANA.map((x, n) => <span key={`s${n}`} className="cal__sem" aria-hidden="true">{x}</span>)}
        {dias.map((d) => (
          <button key={d.toDateString()} type="button" className={`cal__dia${d.getMonth() !== mes.getMonth() ? ' is-fora' : ''}${mesmo(d, hoje) ? ' is-hoje' : ''}`}
            data-prazo-dia={`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`} aria-pressed={mesmo(d, sel)} aria-label={fmtRot.format(d)} onClick={() => dia(d)}>{d.getDate()}</button>
        ))}
      </div>
      <div className="cal__horas">
        <div className="cal__outra">
          <label htmlFor="prazo-outra" className="campo__rot">Hora</label>
          <input id="prazo-outra" type="text" inputMode="numeric" autoComplete="off" placeholder="Outra, ex.: 15:27" aria-label="Outro horário, por exemplo 15:27" maxLength={5} value={outra} aria-invalid={erroHora} aria-describedby={erroHora ? 'prazo-outra-erro' : undefined}
            onChange={(e) => { setOutra(e.target.value); setErroHora(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarOutra(); } }} />
          <button type="button" className="chip" data-prazo-outra="" onClick={aplicarOutra}>Usar</button>
          {erroHora && <span id="prazo-outra-erro" role="alert" className="cal__erro">Use horas e minutos, como 15:27.</span>}
        </div>
        <div className="cal__hgrade">
          {HORAS.map((h) => <button key={h} type="button" className="chip" data-prazo-hora={h} aria-label={h} aria-pressed={h === hora} aria-current={h === agora ? 'time' : undefined} onClick={() => { const [hh, mm] = h.split(':'); aplicarHora(+hh, +mm); }}>{h.slice(0, 2)}h</button>)}
        </div>
      </div>
    </>
  );
}
