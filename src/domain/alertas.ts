// Quais demandas merecem uma notificação agora: entraram em "prazo apertado" ou "atrasada", ou ficaram paradas.
// Cada aviso tem uma chave: mudar o prazo (ou mexer na demanda parada) gera um aviso novo, repetir não.
// Função pura, sem navegador: o mesmo arquivo serve a um envio feito por servidor.
import { estaAberta, estadoItem, estaParado, pedeAtencao, STATUS } from './motor';
import type { Item } from './tipos';

export interface Alerta { chave: string; item: Item; estado: 'atrasado' | 'prazo_apertado' | 'parado' }

export function alertasNovos(itens: Item[], projetosAtivos: Set<string>, t: number, avisados: Set<string>): Alerta[] {
  const out: Alerta[] = [];
  for (const i of itens) {
    if (!estaAberta(i) || !projetosAtivos.has(i.projeto)) continue;
    const prazo = estadoItem(i, t);
    // o prazo vem primeiro: a demanda atrasada e parada recebe só o aviso do prazo
    const estado: Alerta['estado'] | null = pedeAtencao(prazo) ? prazo : estaParado(i, t) ? 'parado' : null;
    if (!estado) continue;
    const chave = estado === 'parado' ? `${i.id}|parado|${i.atualizado}` : `${i.id}|${estado}|${i.prazo}`;
    if (!avisados.has(chave)) out.push({ chave, item: i, estado });
  }
  return out;
}

/** título e texto da notificação: uma demanda pelo nome, várias pelo total */
export function textoAlerta(as: Alerta[], dur: (ms: number) => string, t: number): { titulo: string; corpo: string } {
  if (as.length === 1) {
    const { item: i, estado } = as[0];
    if (estado === 'parado') return { titulo: `${i.id} parada há ${dur(t - Date.parse(i.atualizado))}`, corpo: `${i.titulo} · ${STATUS[i.status]}` };
    const d = dur(Date.parse(i.prazo!) - t);
    return { titulo: estado === 'atrasado' ? `${i.id} atrasou` : `${i.id} vence em ${d}`, corpo: estado === 'atrasado' ? `${i.titulo} · atrasada há ${d}` : i.titulo };
  }
  const conta = (e: Alerta['estado']) => as.filter((a) => a.estado === e).length;
  const atrasadas = conta('atrasado'), apertadas = conta('prazo_apertado'), paradas = conta('parado');
  const partes = [
    atrasadas && `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`,
    apertadas && `${apertadas} com prazo apertado`,
    paradas && `${paradas} ${paradas === 1 ? 'parada' : 'paradas'}`,
  ].filter(Boolean) as string[];
  const lista = partes.length > 2 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes.join(' e ');
  return { titulo: `${as.length} demandas precisam de atenção`, corpo: `${lista}: ${as.map((a) => a.item.id).join(', ')}` };
}
