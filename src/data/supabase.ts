// Repositório no Supabase: mesma interface do local. Grava só o que mudou, com um pequeno atraso
// para juntar várias edições seguidas, e recebe as mudanças feitas em outro aparelho (Realtime).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Estado } from '../domain/tipos';
import { lerEstado, repositorioLocal, type Repositorio } from './armazenamento';
import { diferenca, estadoParaLinhas, linhasParaEstado, linhasVazias, type Linhas } from './linhas';

const TABELAS = ['projetos', 'demandas', 'ideias'] as const;
const ATRASO = 600;

export interface OpcoesSupabase {
  /** avisa na tela quando uma gravação falha */
  onErro: (msg: string) => void;
}

async function lerLinhas(db: SupabaseClient): Promise<Linhas> {
  const [p, d, i, c] = await Promise.all([
    db.from('projetos').select('id, sigla, nome, curto, cor, tinta, arquivado, ordem'),
    db.from('demandas').select('id, projeto, titulo, status, prioridade, prazo, descricao, checklist, historico, criado, atualizado'),
    db.from('ideias').select('id, texto, criado, promovida, ordem'),
    db.from('contadores').select('seq, seq_ideia, girar').maybeSingle(),
  ]);
  const erro = p.error ?? d.error ?? i.error ?? c.error;
  if (erro) throw erro;
  return { projetos: p.data ?? [], demandas: d.data ?? [], ideias: i.data ?? [], contadores: c.data ?? null };
}

export function repositorioSupabase(db: SupabaseClient, { onErro }: OpcoesSupabase): Repositorio & { assinar(fn: (S: Estado) => void): () => void } {
  const local = repositorioLocal();
  /** como o banco está, do ponto de vista do app (o que já foi gravado) */
  let gravado: Linhas = { projetos: [], demandas: [], ideias: [], contadores: null };
  let pendente: Estado | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fila: Promise<void> = Promise.resolve();

  async function gravar(S: Estado) {
    const novo = estadoParaLinhas(S);
    const m = {
      projetos: diferenca(gravado.projetos, novo.projetos),
      demandas: diferenca(gravado.demandas, novo.demandas),
      ideias: diferenca(gravado.ideias, novo.ideias),
    };
    // ordem por causa da chave estrangeira: projeto antes da demanda; demanda sai antes do projeto
    const passos: (() => PromiseLike<{ error: unknown }>)[] = [];
    if (m.projetos.gravar.length) passos.push(() => db.from('projetos').upsert(m.projetos.gravar));
    if (m.demandas.gravar.length) passos.push(() => db.from('demandas').upsert(m.demandas.gravar));
    if (m.ideias.gravar.length) passos.push(() => db.from('ideias').upsert(m.ideias.gravar));
    if (m.demandas.apagar.length) passos.push(() => db.from('demandas').delete().in('id', m.demandas.apagar));
    if (m.ideias.apagar.length) passos.push(() => db.from('ideias').delete().in('id', m.ideias.apagar));
    if (m.projetos.apagar.length) passos.push(() => db.from('projetos').delete().in('id', m.projetos.apagar));
    if (JSON.stringify(gravado.contadores) !== JSON.stringify(novo.contadores)) passos.push(() => db.from('contadores').upsert(novo.contadores!));
    for (const passo of passos) {
      const { error } = await passo();
      if (error) throw error;
    }
    gravado = novo;
  }

  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const S = pendente;
      pendente = null;
      if (!S) return;
      fila = fila.then(() => gravar(S)).catch((e) => {
        console.error(e);
        onErro('Não consegui salvar na sua conta. A cópia deste navegador está guardada; tento de novo na próxima mudança.');
      });
    }, ATRASO);
  }

  return {
    async carregar() {
      const linhas = await lerLinhas(db);
      if (!linhasVazias(linhas)) {
        // normaliza datas e ordem para comparar no mesmo formato que o app grava
        const estado = linhasParaEstado(linhas);
        gravado = estadoParaLinhas(estado);
        return { estado };
      }
      // conta nova: leva para o banco o que já existe neste navegador (ou o exemplo)
      const { estado } = lerEstado(localStorageOuNulo(), Date.now());
      await gravar(estado);
      return { estado, aviso: 'Conta nova: levei para ela os dados que estavam neste navegador.' };
    },
    salvar(S) {
      local.salvar(S); // cópia no navegador, para não depender só da rede
      pendente = S;
      agendar();
    },
    guardarCopia: local.guardarCopia,
    assinar(fn) {
      let t: ReturnType<typeof setTimeout> | undefined;
      const recarregar = () => {
        clearTimeout(t);
        t = setTimeout(async () => {
          // com edição esperando para gravar, a versão local é a mais nova: espera ela sair
          if (pendente) return recarregar();
          await fila;
          try {
            const linhas = await lerLinhas(db);
            const estado = linhasParaEstado(linhas);
            const normal = estadoParaLinhas(estado);
            if (JSON.stringify(normal) === JSON.stringify(gravado)) return; // eco da própria gravação
            gravado = normal;
            fn(estado);
          } catch (e) { console.error(e); }
        }, 400);
      };
      const canal = db.channel('panicboard');
      for (const tabela of [...TABELAS, 'contadores']) canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, recarregar);
      canal.subscribe();
      return () => { clearTimeout(t); void db.removeChannel(canal); };
    },
  };
}

function localStorageOuNulo() {
  try { return window.localStorage; } catch { return null; }
}
