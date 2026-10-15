export type ReportPeriod = '7' | '30' | 'month'

export function periodRange(period: ReportPeriod): { fromUtc: string; toUtc: string } {
  const to = new Date()
  const from = new Date()
  if (period === '7') from.setDate(from.getDate() - 7)
  else if (period === '30') from.setDate(from.getDate() - 30)
  else {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  }
  return { fromUtc: from.toISOString(), toUtc: to.toISOString() }
}

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  '7': '7 днів',
  '30': '30 днів',
  month: 'Поточний місяць',
}

export const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

export const fmtNum = (n?: number | null) => (n == null ? '—' : n.toLocaleString('uk-UA'))

export const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export function normalizePeriodSeries(data: unknown, valueKey?: string): { name: string; value: number }[] {
  if (!Array.isArray(data)) return []
  return data.map((row, i) => {
    const r = row as Record<string, unknown>
    const name = String(r.period ?? r.date ?? r.label ?? r.bucket ?? i + 1)
    const value = Number(
      valueKey && r[valueKey] != null
        ? r[valueKey]
        : (r.totalAmount ?? r.completedSalesTotal ?? r.total ?? r.count ?? r.orderCount ?? 0),
    )
    return { name, value }
  })
}
