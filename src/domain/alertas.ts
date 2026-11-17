// Quais demandas merecem uma notificação agora: entraram em "prazo apertado" ou "atrasada".
// Cada aviso tem uma chave (demanda + estado + prazo): mudar o prazo gera um aviso novo, repetir não.
import { ABERTO, estadoItem } from './motor';
import type { Item } from './tipos';

export interface Alerta { chave: string; item: Item; estado: 'atrasado' | 'prazo_apertado' }

export function alertasNovos(itens: Item[], projetosAtivos: Set<string>, t: number, avisados: Set<string>): Alerta[] {
  const out: Alerta[] = [];
  for (const i of itens) {
    if (!ABERTO(i) || !projetosAtivos.has(i.projeto)) continue;
    const estado = estadoItem(i, t);
    if (estado !== 'atrasado' && estado !== 'prazo_apertado') continue;
    const chave = `${i.id}|${estado}|${i.prazo}`;
    if (!avisados.has(chave)) out.push({ chave, item: i, estado });
  }
  return out;
}

/** título e texto da notificação: uma demanda pelo nome, várias pelo total */
export function textoAlerta(as: Alerta[], dur: (ms: number) => string, t: number): { titulo: string; corpo: string } {
  if (as.length === 1) {
    const { item: i, estado } = as[0];
    const d = dur(Date.parse(i.prazo!) - t);
    return { titulo: estado === 'atrasado' ? `${i.id} atrasou` : `${i.id} vence em ${d}`, corpo: estado === 'atrasado' ? `${i.titulo} · atrasada há ${d}` : i.titulo };
  }
  const atrasadas = as.filter((a) => a.estado === 'atrasado').length;
  const partes = [atrasadas && `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`, as.length - atrasadas && `${as.length - atrasadas} com prazo apertado`].filter(Boolean);
  return { titulo: `${as.length} demandas precisam de atenção`, corpo: `${partes.join(' e ')}: ${as.map((a) => a.item.id).join(', ')}` };
}
