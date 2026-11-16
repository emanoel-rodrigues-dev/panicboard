export type Status = 'backlog' | 'fazer' | 'fazendo' | 'revisao' | 'feito';
export type Prioridade = 'alta' | 'media' | 'baixa';
export type Regra = 'atrasado' | 'prazo_apertado' | 'abandonado' | 'em_dia';
export type EstadoItem = 'atrasado' | 'prazo_apertado' | 'normal' | 'feito';

export interface Projeto {
  id: string;
  sigla: string;
  nome: string;
  curto: string;
  cor: string;
  /** cor do texto sobre a cor do projeto */
  tinta: string;
}

export interface Passo { t: string; feito: boolean }
export interface Evento { em: string; texto: string }

export interface Item {
  id: string;
  projeto: string;
  titulo: string;
  status: Status;
  prioridade: Prioridade;
  /** ISO 8601 ou null */
  prazo: string | null;
  descricao: string;
  checklist: Passo[];
  historico: Evento[];
  criado: string;
  atualizado: string;
}

export interface Ideia {
  id: string;
  texto: string;
  criado: string;
  /** id da demanda criada a partir da ideia */
  promovida: string | null;
}

export interface Estado {
  versao: 1;
  itens: Item[];
  ideias: Ideia[];
  seq: Record<string, number>;
  seqIdeia: number;
  /** quantas vezes o GIF de cada regra foi trocado */
  girar: Partial<Record<Regra, number>>;
}

export interface Reacao {
  id: string;
  personagem: string;
  obra: string;
  fala_curta_pt: string;
  gif: string;
  still: string;
  pagina: string;
}
