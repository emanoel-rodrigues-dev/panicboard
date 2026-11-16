import { useEffect, useState } from 'react';
import type { Rota } from './contexto';

/** Hora real, atualizada a cada minuto e ao voltar para a aba (bug 7: a tela não ficava parada). */
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
