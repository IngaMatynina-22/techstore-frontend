import { useMemo } from 'react'
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { reportsApi } from '@/api/admin.api'
import { fmtMoney, fmtNum, normalizePeriodSeries, periodRange, type ReportPeriod } from './reportUtils'

export function SalesReportPage({ period }: { period: ReportPeriod }) {
  const range = useMemo(() => periodRange(period), [period])
  const salesQ = useQuery({
    queryKey: ['reports', 'sales', range],
    queryFn: () => reportsApi.sales(range),
  })
  const periodQ = useQuery({
    queryKey: ['orders', 'by-period', range],
    queryFn: () => ordersApi.byPeriod(range),
  })

  if (salesQ.isLoading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }
  if (salesQ.error) return <QueryError message={getErrorMessage(salesQ.error)} onRetry={() => void salesQ.refetch()} />

  const s = salesQ.data!
  const orderBars = [
    { name: 'Усього', value: s.totalOrders },
    { name: 'Завершені', value: s.completedOrders },
    { name: 'Скасовані', value: s.cancelledOrders },
  ]
  const moneyBars = [
    { name: 'Брутто', value: s.grossOrderTotal },
    { name: 'Завершені продажі', value: s.completedSalesTotal },
    { name: 'Повернення', value: s.returnLineTotal },
  ]
  const series = normalizePeriodSeries(periodQ.data)

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        {[
          { label: 'Завершені продажі', value: fmtMoney(s.completedSalesTotal) },
          { label: 'Середній чек', value: fmtMoney(s.averageCompletedOrderValue) },
          { label: 'Замовлень', value: fmtNum(s.totalOrders) },
          { label: 'Завершено', value: fmtNum(s.completedOrders) },
        ].map((k) => (
          <Paper key={k.label} sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {k.label}
            </Typography>
            <Typography variant="h6">{k.value}</Typography>
          </Paper>
        ))}
      </Box>
      {s.notes && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {s.notes}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" gutterBottom>
              Замовлення за статусом
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={orderBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Кількість" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" gutterBottom>
              Суми (₴)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={moneyBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={((v: unknown) => fmtMoney(Number(v))) as any} />
                <Bar dataKey="value" fill="#10b981" name="Сума" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        {series.length > 0 && (
          <Paper sx={{ p: 2, height: 320, gridColumn: { md: '1 / -1' } }}>
              <Typography variant="subtitle2" gutterBottom>
                Динаміка за період
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" name="Показник" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
        )}
      </Box>
    </Box>
  )
}
