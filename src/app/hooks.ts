import { useEffect, useState } from 'react';
import { ativos } from '../domain/projetos';
import type { Projeto } from '../domain/tipos';
import { $, type Rota } from './contexto';

/** Hora real, atualizada a cada minuto e ao voltar para a aba, para os prazos da tela não ficarem parados. */
export function useHoraReal(intervalo = 60e3): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const tic = () => setAgora(Date.now());
    const id = setInterval(tic, intervalo);
    const visivel = () => { if (document.visibilityState === 'visible') tic(); };
    document.addEventListener('visibilitychange', visivel);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', visivel); };
  }, [intervalo]);
  return agora;
}

export function useMedia(q: string): boolean {
  const [ok, setOk] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const mudar = () => setOk(m.matches);
    m.addEventListener('change', mudar);
    return () => m.removeEventListener('change', mudar);
  }, [q]);
  return ok;
}

export function lerRota(): Rota {
  const [, nome = '', sub = ''] = location.hash.split('/');
  return {
    nome: nome === 'quadro' || nome === 'ideias' ? nome : 'radar',
    // o projeto é conferido na tela, contra os projetos cadastrados
    sub: sub || 'todos',
  };
}

/** a nova demanda abre no projeto do filtro do quadro; sem filtro, no primeiro ativo; null sem nenhum ativo */
export function projetoDaNovaDemanda(projetos: Projeto[], rota: Rota): string | null {
  const lista = ativos(projetos);
  const doFiltro = rota.nome === 'quadro' ? lista.find((p) => p.id === rota.sub) : undefined;
  return (doFiltro ?? lista[0])?.id ?? null;
}

/**
 * Enquanto `aberto`: Esc fecha e devolve o foco para `voltarPara`, e um clique fora de `dentro` fecha.
 * O Esc é ouvido na captura e não segue adiante, para não fechar junto a gaveta por trás.
 */
export function useFecharAoSair(aberto: boolean, setAberto: (v: boolean) => void, dentro: string, voltarPara: string) {
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setAberto(false);
      $(voltarPara)?.focus();
    };
    const clique = (e: MouseEvent) => { if (!(e.target as Element).closest(dentro)) setAberto(false); };
    document.addEventListener('keydown', tecla, true);
    document.addEventListener('click', clique);
    return () => { document.removeEventListener('keydown', tecla, true); document.removeEventListener('click', clique); };
  }, [aberto, setAberto, dentro, voltarPara]);
}
