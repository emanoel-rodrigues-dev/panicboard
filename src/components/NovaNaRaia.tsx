import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useApp } from '../app/contexto';
import { criarItem } from '../domain/acoes';
import { STATUS } from '../domain/motor';
import { ativos, proj } from '../domain/projetos';
import { padraoDaRaia } from '../domain/raias';
import { fmtCurta } from '../domain/tempo';
import { Ico, vars } from './Icone';

interface Props {
  raia: string;
  nomeRaia: string;
  aberta: boolean;
  onAbrir: () => void;
  onFechar: () => void;
  /** projeto da demanda; com o filtro em "Todos" (escolher=true) a pessoa troca ali mesmo */
  projeto: string;
  escolher: boolean;
  onProjeto: (id: string) => void;
}

/** "Adicionar demanda" no pé da coluna: só o título; status e prazo vêm da coluna. */
export function NovaNaRaia({ raia, nomeRaia, aberta, onAbrir, onFechar, projeto, escolher, onProjeto }: Props) {
  const { S, t, reduz, atualizar, avisar, abrirFicha } = useApp();
  const [titulo, setTitulo] = useState('');
  const [erro, setErro] = useState(false);
  const [semPrazo, setSemPrazo] = useState(false);
  const [criadas, setCriadas] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const acoes = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  /** ao fechar pelo Esc ou pelo Cancelar, o foco volta para o botão da coluna */
  const devolver = useRef(false);
  const padrao = padraoDaRaia(raia, t);

  // ao abrir e a cada demanda criada (o cartão novo empurra o campo para baixo): foco no campo e a tela rola até os botões
  useEffect(() => {
    if (!aberta) { if (devolver.current) { devolver.current = false; botao.current?.focus(); } return; }
    campo.current?.focus({ preventScroll: true });
    acoes.current?.scrollIntoView({ block: 'nearest', behavior: reduz ? 'instant' : 'smooth' });
  }, [aberta, criadas, reduz]);
  // clicar fora com o campo vazio fecha; com texto, ele fica esperando
  // (pelo clique e não pela perda de foco: clicar no rótulo de um projeto tira o foco do campo sem sair do formulário)
  useEffect(() => {
    if (!aberta || titulo.trim()) return;
    const fora = (e: PointerEvent) => { if (!form.current?.contains(e.target as Node)) { setErro(false); onFechar(); } };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberta, titulo, onFechar]);

  if (!padrao) return null;
  const id = `nova-${raia}`;
  const porStatus = raia === 'fazer' || raia === 'fazendo' || raia === 'revisao';

  if (!aberta) {
    return (
      <button ref={botao} className="raia__add" type="button" data-raia-add={raia} aria-label={`Adicionar demanda em ${nomeRaia}`} onClick={onAbrir}>
        <Ico nome="mais" /><span>Adicionar demanda</span>
      </button>
    );
  }

  const fechar = (devolverFoco: boolean) => {
    devolver.current = devolverFoco;
    setTitulo(''); setErro(false); setSemPrazo(false); onFechar();
  };
  const criar = (e: FormEvent) => {
    e.preventDefault();
    const tit = titulo.trim();
    if (!tit) { setErro(true); campo.current?.focus(); return; }
    const [S2, item] = criarItem(S, { projeto, titulo: tit, prioridade: 'media', descricao: '', checklist: [], ...padrao, prazo: semPrazo ? null : padrao.prazo }, t);
    atualizar(() => S2);
    setTitulo(''); setCriadas((n) => n + 1);
    avisar(`${item.id} criada em ${proj(S.projetos, projeto).curto}.`, { rotulo: 'Abrir a ficha', fn: () => abrirFicha(item.id) });
  };
  const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); } };
  // pelo teclado (Tab para fora) com o campo vazio também fecha
  const sair = (e: FocusEvent<HTMLFormElement>) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && !titulo.trim()) fechar(false); };

  return (
    <form ref={form} className="raia__nova" data-raia-nova={raia} noValidate onSubmit={criar} onKeyDown={tecla} onBlur={sair}>
      <div className="campo">
        <label className="sr" htmlFor={id}>{`Título da nova demanda em ${nomeRaia}`}</label>
        <input id={id} ref={campo} value={titulo} autoComplete="off" placeholder="O que precisa fazer?" aria-invalid={erro || undefined} aria-describedby={`${id}-erro ${id}-dica`}
          onChange={(e) => { setTitulo(e.target.value); if (e.target.value.trim()) setErro(false); }} />
        <p className="field__error" id={`${id}-erro`} hidden={!erro}>Escreva um título para a demanda.</p>
      </div>
      {escolher && (
        <fieldset className="raia__proj"><legend className="sr">Projeto</legend><div className="opcoes">
          {ativos(S.projetos).map((p) => (
            <label key={p.id} className="opc opc--proj" style={vars({ '--pc': p.cor, '--pt': p.tinta })} data-tip={p.curto}>
              <input type="radio" name={`${id}-proj`} value={p.id} checked={p.id === projeto} onChange={() => onProjeto(p.id)} />
              <span><i className="ptag__dot" aria-hidden="true" />{p.sigla}<span className="sr">{` ${p.curto}`}</span></span>
            </label>
          ))}
        </div></fieldset>
      )}
      <div className="raia__dicalinha">
        <p className="raia__dica" id={`${id}-dica`}>{`${STATUS[padrao.status]} · ${padrao.prazo && !semPrazo ? `prazo ${fmtCurta.format(Date.parse(padrao.prazo))}` : 'sem prazo'}`}</p>
        {/* nas colunas por status o prazo é só uma sugestão; nas por prazo a coluna define a data */}
        {porStatus && <button type="button" className="chip" data-raia-sem-prazo={raia} aria-pressed={semPrazo} onClick={() => setSemPrazo((v) => !v)}>Sem prazo</button>}
      </div>
      <div className="btn-row raia__acoes" ref={acoes}>
        <button className="btn btn--primary" type="submit">Adicionar</button>
        <button className="btn btn--secondary" type="button" onClick={() => fechar(true)}>Cancelar</button>
      </div>
    </form>
  );
}
