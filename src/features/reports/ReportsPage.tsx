import { useMemo, useState } from 'react'
import { Box, CircularProgress, Paper, Tab, Tabs, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/feedback/PageHeader'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { reportsApi } from '@/api/admin.api'
import { SalesReportPage } from './SalesReportPage'
import { PERIOD_LABELS, fmtMoney, fmtNum, periodRange, type ReportPeriod } from './reportUtils'

function InventorySection({ period: _period }: { period: ReportPeriod }) {
  const q = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => reportsApi.inventory(),
  })
  if (q.isLoading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }
  if (q.error) return <QueryError message={getErrorMessage(q.error)} onRetry={() => void q.refetch()} />
  const d = q.data!
  const stockBars = [
    { name: 'На складі', value: d.totalOnHand },
    { name: 'Резерв', value: d.totalReserved },
    { name: 'Доступно', value: d.totalAvailable },
  ]
  const alertBars = [
    { name: 'Низький залишок', value: d.lowStockSkuCount },
    { name: 'Немає в наявності', value: d.outOfStockSkuCount },
    { name: 'SKU', value: d.skuCount },
  ]
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        {[
          { label: 'SKU', value: fmtNum(d.skuCount) },
          { label: 'Доступно од.', value: fmtNum(d.totalAvailable) },
          { label: 'Оцінка закупівлі', value: fmtMoney(d.valuationByPurchasePrice) },
          { label: 'Низький залишок', value: fmtNum(d.lowStockSkuCount) },
        ].map((k) => (
          <Paper key={k.label} sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {k.label}
            </Typography>
            <Typography variant="h6">{k.value}</Typography>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper sx={{ p: 2, height: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            Залишки (од.)
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={stockBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        <Paper sx={{ p: 2, height: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            Сигнали запасів
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={alertBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
      {d.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {d.notes}
        </Typography>
      )}
    </Box>
  )
}

function PurchasingSection({ period }: { period: ReportPeriod }) {
  const range = useMemo(() => periodRange(period), [period])
  const q = useQuery({
    queryKey: ['reports', 'purchasing', range],
    queryFn: () => reportsApi.purchasing(range),
  })
  if (q.isLoading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }
  if (q.error) return <QueryError message={getErrorMessage(q.error)} onRetry={() => void q.refetch()} />
  const d = q.data!
  const bars = [
    { name: 'Замовлень', value: d.purchaseOrderCount },
    { name: 'Прийнято од.', value: d.receivedLineQuantity },
    { name: 'Сума прийому', value: d.receivedPurchaseTotal },
  ]
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
        {[
          { label: 'Закупівель', value: fmtNum(d.purchaseOrderCount) },
          { label: 'Прийнято од.', value: fmtNum(d.receivedLineQuantity) },
          { label: 'Сума прийому', value: fmtMoney(d.receivedPurchaseTotal) },
        ].map((k) => (
          <Paper key={k.label} sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {k.label}
            </Typography>
            <Typography variant="h6">{k.value}</Typography>
          </Paper>
        ))}
      </Box>
      <Paper sx={{ p: 2, height: 320 }}>
        <Typography variant="subtitle2" gutterBottom>
          Закупівлі за період
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={bars}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip formatter={((v: unknown, _n: unknown, p: { payload?: { name?: string } }) =>
              p.payload?.name === 'Сума прийому' ? fmtMoney(Number(v)) : fmtNum(Number(v))) as any}
            />
            <Bar dataKey="value" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
      {d.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {d.notes}
        </Typography>
      )}
    </Box>
  )
}

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30')
  const [tab, setTab] = useState(0)

  return (
    <>
      <PageHeader title="Аналітика" description="Звіти з продажів, складу та закупівель" />
      <Tabs value={period} onChange={(_, v) => setPeriod(v as ReportPeriod)} sx={{ mb: 2 }}>
        {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
          <Tab key={p} value={p} label={PERIOD_LABELS[p]} />
        ))}
      </Tabs>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Продажі" />
        <Tab label="Склад" />
        <Tab label="Закупівлі" />
      </Tabs>
      {tab === 0 && <SalesReportPage period={period} />}
      {tab === 1 && <InventorySection period={period} />}
      {tab === 2 && <PurchasingSection period={period} />}
    </>
  )
}
