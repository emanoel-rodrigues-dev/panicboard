import { createContext, useContext } from 'react';
import type { ArmazemImagens } from '../data/imagens';
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
  /** onde ficam os arquivos das imagens das demandas */
  imagens: ArmazemImagens;

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
  /** a demanda aberta na ficha trocou de chave (mudou de projeto): a ficha segue aberta na chave nova */
  renomearFicha: (de: string, para: string) => void;
  /** abre no projeto do filtro do quadro (ou no primeiro); projetoNovo: direto no projeto recém-criado */
  novaDemanda: (projetoNovo?: string) => void;
  /** abre a gaveta de projetos; 'novo' já abre o cadastro, um id abre a edição */
  abrirProjetos: (editando?: string | null) => void;
  avancarRelogio: (h: number) => void;
  restaurarExemplo: () => void;
  /** sem conta: os dados ficam só neste navegador (a demonstração pública) */
  demonstracao: boolean;
}

export const Contexto = createContext<App | null>(null);

export function useApp(): App {
  const a = useContext(Contexto);
  if (!a) throw new Error('useApp fora do <Contexto>');
  return a;
}

export const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
