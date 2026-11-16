import { createContext, useContext } from 'react';
import type { Modo } from '../domain/raias';
import type { Estado } from '../domain/tipos';

export interface Rota { nome: 'radar' | 'quadro' | 'ideias'; sub: string }
export interface AcaoAviso { rotulo: string; fn: () => void }

export interface App {
  S: Estado;
  /** "agora" do app: hora real mais o relógio simulado */
  t: number;
  deslocamentoH: number;
  rota: Rota;
  /** GIFs parados (reduced-motion ou pausa ligada) */
  parado: boolean;
  reduz: boolean;
  pausado: boolean;
  tocando: Set<string>;
  modo: Modo;
  frente: string | null;
  ideiasFiltro: 'abertas' | 'promovidas';

  atualizar: (fn: (S: Estado) => Estado) => void;
  avisar: (msg: string, acao?: AcaoAviso) => void;
  /** foca o seletor depois do próximo render */
  focarDepois: (seletor: string | string[]) => void;
  avancarItem: (id: string) => void;
  alternarGif: (chave: string) => void;
  alternarPausa: () => void;
  setModo: (m: Modo) => void;
  setFrente: (pid: string) => void;
  setIdeiasFiltro: (f: 'abertas' | 'promovidas') => void;
  abrirFicha: (id: string) => void;
  novaDemanda: (pid?: string) => void;
  avancarRelogio: (h: number) => void;
  restaurarExemplo: () => void;
}

export const Contexto = createContext<App | null>(null);

export function useApp(): App {
  const a = useContext(Contexto);
  if (!a) throw new Error('useApp fora do <Contexto>');
  return a;
}

export const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
