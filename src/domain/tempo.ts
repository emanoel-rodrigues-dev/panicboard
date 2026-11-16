export const H = 3600e3;

export function dur(ms: number): string {
  const h = Math.abs(ms) / H;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} dias`;
}

export const fmtData = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtCurta = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtRot = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export const p2 = (n: number) => String(n).padStart(2, '0');

/** Date -> "AAAA-MM-DDTHH:MM" no fuso local (formato do campo de prazo) */
export const paraLocal = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;

/** ISO -> "AAAA-MM-DDTHH:MM" local, ou '' sem prazo */
export const isoParaLocal = (iso: string | null) => (iso ? paraLocal(new Date(Date.parse(iso))) : '');

export function prazoRotulo(v: string, t: number): string {
  if (!v) return 'Sem prazo';
  const d = new Date(v);
  const diff = d.getTime() - t;
  return `${fmtRot.format(d)}, ${p2(d.getHours())}:${p2(d.getMinutes())} · ${diff < 0 ? `passou há ${dur(diff)}` : `em ${dur(diff)}`}`;
}
