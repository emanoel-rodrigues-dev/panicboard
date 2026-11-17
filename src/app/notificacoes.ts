// Notificações de prazo enquanto o app está aberto (inclusive em segundo plano ou instalado).
import { useCallback, useEffect, useState } from 'react';
import { preferencia } from '../data/armazenamento';
import { alertasNovos, textoAlerta } from '../domain/alertas';
import { ativos } from '../domain/projetos';
import { dur } from '../domain/tempo';
import type { Estado } from '../domain/tipos';

const CHAVE = 'avisados';
const lerAvisados = () => { try { return new Set<string>(JSON.parse(preferencia.ler(CHAVE, '[]'))); } catch { return new Set<string>(); } };

async function mostrar(titulo: string, corpo: string) {
  const opcoes: NotificationOptions = { body: corpo, icon: 'icone-192.png', tag: 'panicboard-prazo', data: { url: `${location.pathname}#/quadro` } };
  // pelo service worker funciona também no app instalado no celular; sem ele, a notificação comum
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg) return reg.showNotification(titulo, opcoes);
  const n = new Notification(titulo, opcoes);
  n.onclick = () => { window.focus(); location.hash = '#/quadro'; n.close(); };
}

export interface Avisos { suporte: boolean; ligado: boolean; bloqueado: boolean; ligar: () => Promise<boolean>; desligar: () => void }

/** simulado: com o relógio simulado ligado não notifica (e não marca nada como avisado) */
export function useNotificacoes(S: Estado, t: number, simulado: boolean): Avisos {
  const suporte = typeof Notification !== 'undefined';
  const [ligado, setLigado] = useState(() => suporte && Notification.permission === 'granted' && preferencia.ler('notificar', '0') === '1');
  const [bloqueado, setBloqueado] = useState(() => suporte && Notification.permission === 'denied');

  useEffect(() => {
    if (!ligado || simulado) return;
    const avisados = lerAvisados();
    const novos = alertasNovos(S.itens, new Set(ativos(S.projetos).map((p) => p.id)), t, avisados);
    if (!novos.length) return;
    const { titulo, corpo } = textoAlerta(novos, dur, t);
    preferencia.gravar(CHAVE, JSON.stringify([...avisados, ...novos.map((a) => a.chave)].slice(-300)));
    void mostrar(titulo, corpo).catch((e) => console.error(e));
  }, [S, t, ligado, simulado]);

  const ligar = useCallback(async () => {
    if (!suporte) return false;
    const p = await Notification.requestPermission();
    setBloqueado(p === 'denied');
    if (p !== 'granted') return false;
    preferencia.gravar('notificar', '1');
    setLigado(true);
    return true;
  }, [suporte]);
  const desligar = useCallback(() => { preferencia.gravar('notificar', '0'); setLigado(false); }, []);
  return { suporte, ligado, bloqueado, ligar, desligar };
}
