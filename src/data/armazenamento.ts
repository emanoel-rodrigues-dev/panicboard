// Onde o estado mora. Hoje: localStorage. Depois: Supabase, com a mesma interface.
import { montarExemplo } from '../domain/seed';
import type { Estado } from '../domain/tipos';

export interface Carga {
  estado: Estado;
  /** mensagem para o aviso quando algo precisou ser recuperado */
  aviso?: string;
}

export interface Repositorio {
  carregar(): Promise<Carga>;
  salvar(estado: Estado): void;
  /** guarda uma cópia de segurança antes de uma troca grande (ex.: restaurar o exemplo) */
  guardarCopia(estado: Estado, motivo: string): void;
}

export const CHAVE = 'panicboard.v1';

type Armazem = Pick<Storage, 'getItem' | 'setItem'>;

function valido(s: unknown): s is Estado {
  const e = s as Estado;
  return !!e && e.versao === 1 && Array.isArray(e.itens) && Array.isArray(e.ideias) && typeof e.seq === 'object';
}

/** Lê o estado salvo. Se houver dado com defeito, guarda a cópia em vez de perder em silêncio. */
export function lerEstado(armazem: Armazem | null, agora: number): Carga {
  let raw: string | null = null;
  try { raw = armazem?.getItem(CHAVE) ?? null; } catch { /* sem storage */ }
  if (!raw) return { estado: montarExemplo(agora) };
  try {
    const s = JSON.parse(raw);
    if (valido(s)) {
      // versões anteriores guardavam o relógio simulado no estado; agora ele só vive na sessão
      const { deslocamentoH: _antigo, ...resto } = s as Estado & { deslocamentoH?: number };
      return { estado: { ...resto, girar: resto.girar ?? {} } };
    }
  } catch { /* JSON quebrado: cai no tratamento abaixo */ }
  try { armazem?.setItem(`${CHAVE}.defeito`, raw); } catch { /* ignora */ }
  return { estado: montarExemplo(agora), aviso: `Os dados salvos estavam com defeito. Guardei uma cópia em ${CHAVE}.defeito e abri o exemplo.` };
}

function armazemLocal(): Armazem | null {
  try { return window.localStorage; } catch { return null; }
}

export function repositorioLocal(armazem: Armazem | null = armazemLocal()): Repositorio {
  return {
    async carregar() { return lerEstado(armazem, Date.now()); },
    salvar(estado) { try { armazem?.setItem(CHAVE, JSON.stringify(estado)); } catch { /* cheio ou bloqueado */ } },
    guardarCopia(estado, motivo) { try { armazem?.setItem(`${CHAVE}.${motivo}`, JSON.stringify(estado)); } catch { /* ignora */ } },
  };
}

/** preferências de tela (modo do quadro, pausa, tema), por aparelho */
export const preferencia = {
  ler(k: string, d: string) { try { return localStorage.getItem(`panicboard.ui.${k}`) ?? d; } catch { return d; } },
  gravar(k: string, v: string) { try { localStorage.setItem(`panicboard.ui.${k}`, v); } catch { /* ignora */ } },
};
