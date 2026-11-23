// Onde os arquivos das imagens moram. O estado guarda só os dados delas (id, nome, tamanho); o arquivo fica aqui:
// no navegador (IndexedDB, que aguenta arquivos; o localStorage não) ou no Supabase Storage, numa pasta por usuário.
import type { SupabaseClient } from '@supabase/supabase-js';
import { imagensEmUso } from '../domain/acoes';
import type { Estado } from '../domain/tipos';

export interface ArmazemImagens {
  guardar(id: string, arquivo: Blob): Promise<void>;
  /** endereço para mostrar a imagem num <img> */
  url(id: string): Promise<string>;
  apagar(ids: string[]): Promise<void>;
}

/* ---------- navegador (IndexedDB) ---------- */

const BANCO = 'panicboard', LOJA = 'imagens';

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

function pedido<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return abrirBanco().then((db) => new Promise((ok, falha) => {
    const tx = db.transaction(LOJA, modo);
    const r = fazer(tx.objectStore(LOJA));
    tx.oncomplete = () => { ok(r ? r.result : undefined); db.close(); };
    tx.onerror = () => { falha(tx.error); db.close(); };
  }));
}

export function imagensLocais(): ArmazemImagens {
  const urls = new Map<string, string>();
  return {
    async guardar(id, arquivo) { await pedido('readwrite', (l) => l.put(arquivo, id)); },
    async url(id) {
      const pronta = urls.get(id);
      if (pronta) return pronta;
      const blob = await pedido<Blob>('readonly', (l) => l.get(id) as IDBRequest<Blob>);
      if (!blob) throw new Error(`imagem ${id} não encontrada`);
      const u = URL.createObjectURL(blob);
      urls.set(id, u);
      return u;
    },
    async apagar(ids) {
      if (!ids.length) return;
      await pedido('readwrite', (l) => { ids.forEach((id) => l.delete(id)); });
      ids.forEach((id) => { const u = urls.get(id); if (u) URL.revokeObjectURL(u); urls.delete(id); });
    },
  };
}

/* ---------- conta (Supabase Storage) ---------- */

const BALDE = 'imagens';
/** o link assinado vale 1 h; reaproveita por 50 min */
const VALIDADE_S = 3600, REUSO_MS = 50 * 60e3;

export function imagensSupabase(db: SupabaseClient, usuario: string): ArmazemImagens {
  const caminho = (id: string) => `${usuario}/${id}`;
  const urls = new Map<string, { u: string; ate: number }>();
  return {
    async guardar(id, arquivo) {
      const { error } = await db.storage.from(BALDE).upload(caminho(id), arquivo, { contentType: arquivo.type, upsert: true });
      if (error) throw error;
    },
    async url(id) {
      const pronta = urls.get(id);
      if (pronta && pronta.ate > Date.now()) return pronta.u;
      const { data, error } = await db.storage.from(BALDE).createSignedUrl(caminho(id), VALIDADE_S);
      if (error || !data) throw error ?? new Error('sem link');
      urls.set(id, { u: data.signedUrl, ate: Date.now() + REUSO_MS });
      return data.signedUrl;
    },
    async apagar(ids) {
      if (!ids.length) return;
      const { error } = await db.storage.from(BALDE).remove(ids.map(caminho));
      if (error) throw error;
      ids.forEach((id) => urls.delete(id));
    },
  };
}

/* ---------- limpeza ---------- */

/**
 * Apaga do armazém as imagens que saíram de uso (removidas ou com a demanda excluída).
 * Espera um pouco antes, porque o aviso tem Desfazer: se a imagem voltar a ser usada nesse tempo, ela fica.
 * Devolve a função que recebe cada estado novo.
 */
export function limpezaDeImagens(armazem: ArmazemImagens, esperaMs = 60e3): (S: Estado) => void {
  let antes: Set<string> | null = null;
  let atual: Set<string> = new Set();
  return (S) => {
    atual = imagensEmUso(S);
    const saiu = antes ? [...antes].filter((id) => !atual.has(id)) : [];
    antes = atual;
    if (!saiu.length) return;
    setTimeout(() => {
      const apagar = saiu.filter((id) => !atual.has(id));
      armazem.apagar(apagar).catch((e) => console.error('não consegui apagar imagens fora de uso', e));
    }, esperaMs);
  };
}
