import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { useApp } from '../app/contexto';
import { pendentesDoProjeto } from '../domain/motor';
import { arquivarProjeto, ativos, CORES, coresDaImagem, criarProjeto, editarProjeto, lerHex, limparSigla, rgbParaHex, sugerirSigla, tintaPara, validarProjeto, type DadosProjeto, type ErrosProjeto } from '../domain/projetos';
import type { Projeto } from '../domain/tipos';
import { Ico, vars } from './Icone';

/** null: a lista; 'novo': cadastro; id: edição */
export type Editando = string | null;

interface Props { inicial: Editando; depois?: 'demanda'; onFechar: () => void }

/** foca o seletor depois do render do próprio painel (o focarDepois do App só roda quando o App renderiza) */
function useFocar() {
  const [alvo, setAlvo] = useState<string | null>(null);
  useEffect(() => { if (alvo) { document.querySelector<HTMLElement>(alvo)?.focus(); setAlvo(null); } }, [alvo]);
  return setAlvo;
}

export function Projetos({ inicial, depois, onFechar }: Props) {
  const { S } = useApp();
  const focar = useFocar();
  const [editando, setEditando] = useState<Editando>(inicial);
  const ir = (e: Editando, foco: string) => { setEditando(e); focar(foco); };
  const alvo = editando && editando !== 'novo' ? S.projetos.find((p) => p.id === editando) : undefined;
  if (editando === 'novo' || alvo) {
    return <FormProjeto key={editando} p={alvo} depois={depois} onVoltar={(id) => ir(null, id ? `[data-projeto="${id}"]` : '[data-projeto-novo]')} onFechar={onFechar} />;
  }
  return <ListaProjetos onEditar={(id) => ir(id, '#p-nome')} onFechar={onFechar} />;
}

function ListaProjetos({ onEditar, onFechar }: { onEditar: (id: string) => void; onFechar: () => void }) {
  const { S } = useApp();
  const projetosAtivos = ativos(S.projetos);
  const arquivados = S.projetos.filter((p) => p.arquivado);
  const botao = (p: Projeto) => {
    const n = pendentesDoProjeto(S.itens, p.id).length;
    return (
      <button key={p.id} type="button" className="filtro" data-projeto={p.id} style={vars({ '--pc': p.cor })} aria-label={`Editar ${p.nome}, sigla ${p.sigla}, ${n} ${n === 1 ? 'demanda pendente' : 'demandas pendentes'}`} onClick={() => onEditar(p.id)}>
        <span className="ptag__dot" /><span>{p.nome}</span><span className="filtro__n">{p.sigla}</span>
      </button>
    );
  };
  return (
    <div className="ficha" data-projetos="">
      <div className="ficha__cab">
        <p className="ficha__id">Projetos</p>
        <button className="ficha__fechar" type="button" data-fechar="" aria-label="Fechar" onClick={onFechar}><Ico nome="fechar" /></button>
      </div>
      <h2 id="gaveta-h" className="ficha__h">Seus projetos</h2>
      {projetosAtivos.length
        ? <div className="filtros">{projetosAtivos.map(botao)}</div>
        : <p className="ficha__salvo">Nenhum projeto ativo. Cadastre o primeiro para começar a anotar demandas.</p>}
      <div className="ficha__acoes"><button className="btn btn--primary" type="button" data-projeto-novo="" onClick={() => onEditar('novo')}>Novo projeto</button></div>
      {arquivados.length > 0 && (
        <section className="campo" aria-labelledby="arq-h">
          <h3 id="arq-h" className="campo__rot">Arquivados</h3>
          <div className="filtros">{arquivados.map(botao)}</div>
        </section>
      )}
      <p className="ficha__salvo">Arquivar tira o projeto do radar e do quadro. As demandas dele continuam guardadas.</p>
    </div>
  );
}

function FormProjeto({ p, depois, onVoltar, onFechar }: { p?: Projeto; depois?: 'demanda'; onVoltar: (id?: string) => void; onFechar: () => void }) {
  const { S, atualizar, avisar, reduz, novaDemanda } = useApp();
  const focar = useFocar();
  const [d, setD] = useState<DadosProjeto>(() => ({ nome: p?.nome ?? '', curto: p?.curto ?? '', sigla: p?.sigla ?? '', cor: p?.cor ?? CORES[S.projetos.length % CORES.length].cor }));
  // sigla sugerida pelo nome até a pessoa escrever a dela
  const [siglaManual, setSiglaManual] = useState(!!p);
  const [erros, setErros] = useState<ErrosProjeto>({});
  // "Outra cor": a cor digitada em hex, fora da lista
  const [outra, setOutra] = useState(() => !!p && !CORES.some((c) => c.cor === p.cor));
  const pendentes = p ? pendentesDoProjeto(S.itens, p.id).length : 0;

  const mudar = (campo: keyof DadosProjeto, v: string) => {
    setD((x) => {
      const n = { ...x, [campo]: v };
      if (campo === 'nome' && !siglaManual) n.sigla = sugerirSigla(v);
      return n;
    });
    if (campo === 'sigla') setSiglaManual(true);
    if (erros[campo as keyof ErrosProjeto]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const er = validarProjeto(S.projetos, d, p?.id);
    if (Object.keys(er).length) { setErros(er); document.querySelector<HTMLElement>(er.nome ? '#p-nome' : er.sigla ? '#p-sigla' : '#p-cor')?.focus(); return; }
    if (p) {
      const S2 = editarProjeto(S, p.id, d);
      if (!S2) return;
      atualizar(() => S2);
      avisar(`${d.nome.trim()} salvo.`);
      onFechar();
    } else {
      const r = criarProjeto(S, d);
      if (!r) return;
      atualizar(() => r[0]);
      const id = r[1].id;
      // veio do Nova demanda: segue direto para a demanda, que era o objetivo
      if (depois === 'demanda') { avisar(`${r[1].nome} criado.`); novaDemanda(id); return; }
      avisar(`${r[1].nome} criado.`, { rotulo: 'Criar demanda', fn: () => novaDemanda(id) });
      onFechar();
    }
  };

  const arquivar = () => {
    if (!p) return;
    const novo = !p.arquivado;
    atualizar((s) => arquivarProjeto(s, p.id, novo));
    avisar(novo ? `${p.nome} arquivado.` : `${p.nome} voltou para o radar.`, novo ? { rotulo: 'Desfazer', fn: () => atualizar((s) => arquivarProjeto(s, p.id, false)) } : undefined);
    onFechar();
  };

  const sigla = limparSigla(d.sigla) || '?';
  const hex = lerHex(d.cor);
  const escolherLista = (cor: string) => { setOutra(false); mudar('cor', cor); };
  const escolherOutra = () => { setOutra(true); focar('#p-cor'); };
  // o campo do código aparece abaixo das cores: mostra ele inteiro, com o botão da imagem
  useEffect(() => {
    if (outra) mostrarAcoes(reduz);
  }, [outra, reduz]);
  return (
    <form className="ficha" data-projeto-form="" noValidate style={vars({ '--pc': hex ?? CORES[0].cor })} onSubmit={salvar}>
      <div className="ficha__cab">
        <p className="ficha__id">{p ? `Projetos · ${p.sigla}` : 'Novo projeto'}</p>
        <button className="ficha__fechar" type="button" data-fechar="" aria-label="Fechar" onClick={onFechar}><Ico nome="fechar" /></button>
      </div>
      <h2 id="gaveta-h" className="ficha__h">{p ? p.nome : 'Qual é o projeto?'}</h2>
      <div className="campo">
        <label htmlFor="p-nome">Nome</label>
        <input id="p-nome" value={d.nome} autoComplete="off" aria-describedby="p-nome-erro" aria-invalid={!!erros.nome || undefined} onChange={(e) => mudar('nome', e.target.value)} />
        <p className="field__error" id="p-nome-erro" hidden={!erros.nome}>{erros.nome}</p>
      </div>
      <div className="campo-par">
        <div className="campo">
          <label htmlFor="p-curto">Nome curto</label>
          <input id="p-curto" value={d.curto} autoComplete="off" placeholder="Igual ao nome" aria-describedby="p-curto-dica" onChange={(e) => mudar('curto', e.target.value)} />
          <p className="ficha__salvo" id="p-curto-dica">Em branco, usa o nome.</p>
        </div>
        <div className="campo">
          <label htmlFor="p-sigla">Sigla</label>
          <input id="p-sigla" value={d.sigla} autoComplete="off" maxLength={3} aria-describedby="p-sigla-dica p-sigla-erro" aria-invalid={!!erros.sigla || undefined} onChange={(e) => mudar('sigla', e.target.value.toUpperCase())} />
          <p className="ficha__salvo" id="p-sigla-dica">{`Código das demandas: ${sigla}-1`}</p>
          <p className="field__error" id="p-sigla-erro" hidden={!erros.sigla}>{erros.sigla}</p>
        </div>
      </div>
      <fieldset className="campo"><legend>Cor</legend><div className="opcoes">
        {CORES.map((c) => (
          <label key={c.cor} className="opc opc--proj" style={vars({ '--pc': c.cor, '--pt': c.tinta })}>
            <input type="radio" name="cor" value={c.cor} checked={!outra && d.cor === c.cor} onChange={() => escolherLista(c.cor)} />
            <span><i className="ptag__dot" aria-hidden="true" />{c.nome}</span>
          </label>
        ))}
        {/* a própria opção vira a amostra: pintada com a cor digitada e com a tinta calculada */}
        <label className="opc opc--proj" style={vars(outra && hex ? { '--pc': hex, '--pt': tintaPara(hex) } : { '--pc': 'var(--muted)', '--pt': 'var(--surface)' })}>
          <input type="radio" name="cor" value="outra" data-cor-outra="" checked={outra} onChange={escolherOutra} />
          <span><i className="ptag__dot" aria-hidden="true" />{outra && hex ? `Outra: ${hex}` : 'Outra cor'}</span>
        </label>
      </div></fieldset>
      {outra && (
        <div className="campo">
          <label htmlFor="p-cor">Código da cor</label>
          <input id="p-cor" value={d.cor} autoComplete="off" spellCheck={false} maxLength={7} placeholder="#2f9e44" aria-describedby="p-cor-dica p-cor-erro" aria-invalid={!!erros.cor || undefined} onChange={(e) => mudar('cor', e.target.value)} />
          <p className="ficha__salvo" id="p-cor-dica">Em hexadecimal, como #2f9e44. A cor do texto por cima é escolhida sozinha, para ficar legível.</p>
          <p className="field__error" id="p-cor-erro" hidden={!erros.cor}>{erros.cor}</p>
          <PegarDaImagem atual={hex} sigla={sigla} onEscolher={(c) => mudar('cor', c)} />
        </div>
      )}
      <div className="ficha__acoes">
        <button className="btn btn--primary" type="submit">{p ? 'Salvar' : 'Criar projeto'}</button>
        <button className="btn btn--secondary" type="button" data-voltar="" onClick={() => onVoltar(p?.id)}>Cancelar</button>
      </div>
      {p && (
        <>
          {limparSigla(d.sigla) && p.sigla !== limparSigla(d.sigla) && <p className="ficha__salvo">{`As demandas que já existem continuam com o código ${p.sigla}.`}</p>}
          <div className="ficha__acoes">
            <button className="btn btn--secondary" type="button" data-arquivar={p.id} onClick={arquivar}>{p.arquivado ? 'Reativar o projeto' : 'Arquivar o projeto'}</button>
          </div>
          <p className="ficha__salvo">{p.arquivado
            ? 'Arquivado: fora do radar e do quadro.'
            : `${pendentes ? `${pendentes} ${pendentes === 1 ? 'demanda pendente fica' : 'demandas pendentes ficam'} guardadas se arquivar.` : 'Nenhuma demanda pendente.'}`}</p>
        </>
      )}
    </form>
  );
}

/** rola a gaveta até os botões Criar/Salvar: o que acabou de aparecer acima deles fica à vista */
const mostrarAcoes = (reduz: boolean) => document.querySelector('[data-projeto-form] .ficha__acoes')?.scrollIntoView({ block: 'nearest', behavior: reduz ? 'auto' : 'smooth' });

/** Lê a imagem só no navegador (não é salva), sugere as cores principais e deixa clicar num ponto. */
function PegarDaImagem({ atual, sigla, onEscolher }: { atual: string | null; sigla: string; onEscolher: (cor: string) => void }) {
  const arquivo = useRef<HTMLInputElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const { reduz } = useApp();
  const [sugeridas, setSugeridas] = useState<string[] | null>(null);
  const [erro, setErro] = useState('');
  // o que aparece depois de escolher a imagem fica abaixo da dobra: a gaveta rola até lá sozinha
  useEffect(() => {
    if (sugeridas || erro) mostrarAcoes(reduz);
  }, [sugeridas, erro, reduz]);

  const ler = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErro('Escolha um arquivo de imagem (PNG, JPG, SVG…).'); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = tela.current;
      const ctx = c?.getContext('2d', { willReadFrequently: true });
      if (!c || !ctx) return;
      const escala = Math.min(1, 440 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      c.width = Math.max(1, Math.round((img.naturalWidth || 200) * escala));
      c.height = Math.max(1, Math.round((img.naturalHeight || 200) * escala));
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const cores = coresDaImagem(ctx.getImageData(0, 0, c.width, c.height).data);
      setErro(cores.length ? '' : 'Não achei cores nessa imagem.');
      setSugeridas(cores);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErro('Não consegui abrir essa imagem.'); };
    img.src = url;
  };

  const clicar = (e: MouseEvent<HTMLCanvasElement>) => {
    const c = tela.current!;
    const r = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * c.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * c.height);
    const [pr, pg, pb, pa] = c.getContext('2d')!.getImageData(x, y, 1, 1).data;
    if (pa < 128) return; // ponto transparente
    onEscolher(rgbParaHex(pr, pg, pb));
  };

  return (
    <div className="cor-imagem" data-cor-imagem="">
      <input ref={arquivo} type="file" accept="image/*" hidden aria-label="Imagem para pegar a cor" onChange={ler} data-cor-arquivo="" />
      <button className="btn btn--secondary" type="button" data-cor-pegar="" onClick={() => arquivo.current?.click()}>{sugeridas ? 'Trocar a imagem' : 'Pegar da imagem'}</button>
      {erro && <p className="field__error">{erro}</p>}
      <canvas ref={tela} hidden={!sugeridas?.length} role="img" aria-label="A imagem escolhida. Clique num ponto para usar a cor dele." onClick={clicar} />
      {!!sugeridas?.length && (
        <>
          <p className="ficha__salvo">Cores da imagem. Clique numa delas ou num ponto da imagem.</p>
          <div className="opcoes" role="group" aria-label="Cores da imagem">
            {sugeridas.map((c) => <button key={c} type="button" className="promo" style={vars({ '--pc': c, '--pt': tintaPara(c) })} data-cor-sugerida={c} aria-pressed={atual === c} aria-label={`Usar a cor ${c}`} onClick={() => onEscolher(c)}>{atual === c ? `✓ ${c}` : c}</button>)}
          </div>
          {/* a confirmação fica perto de onde se clica: a cor que vale agora, como a etiqueta do projeto vai aparecer */}
          <p className="ficha__salvo" data-cor-previa="" aria-live="polite">{atual
            ? <>Escolhida <span className="promo" style={vars({ '--pc': atual, '--pt': tintaPara(atual) })}>{sigla}</span>{` ${atual}`}</>
            : 'Nenhuma cor escolhida ainda.'}</p>
        </>
      )}
    </div>
  );
}
