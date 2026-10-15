import { useMemo, useState } from 'react'
import {
  Box,
  Link,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { getErrorMessage } from '@/api/client'
import { reportsApi } from '@/api/admin.api'
import { ordersApi, type OrderSummary } from '@/api/orders.api'
import { inventoryApi, type InventoryItem } from '@/api/inventory.api'
import { returnsApi, RETURN_STATUS, type ReturnSummary } from '@/api/returns.api'
import { PERIOD_LABELS, fmtDateTime, fmtMoney, fmtNum, periodRange, type ReportPeriod } from '@/features/reports/reportUtils'

function KpiCard({
  label,
  value,
  to,
  hint,
}: {
  label: string
  value: string
  to?: string
  hint?: string
}) {
  const inner = (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 600 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Paper>
  )
  return to ? (
    <Link component={RouterLink} to={to} underline="none" color="inherit">
      {inner}
    </Link>
  ) : (
    inner
  )
}

export function DashboardPage() {
  const [period, setPeriod] = useState<ReportPeriod>('7')
  const range = useMemo(() => periodRange(period), [period])

  const salesQ = useQuery({ queryKey: ['reports', 'sales', range], queryFn: () => reportsApi.sales(range) })
  const invQ = useQuery({ queryKey: ['reports', 'inventory'], queryFn: () => reportsApi.inventory() })
  const purchQ = useQuery({ queryKey: ['reports', 'purchasing', range], queryFn: () => reportsApi.purchasing(range) })
  const ordersQ = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => ordersApi.list({ page: 1, pageSize: 8, sortBy: 'createdAtDesc' }),
  })
  const lowStockQ = useQuery({
    queryKey: ['inventory', 'low-stock-preview'],
    queryFn: () => inventoryApi.lowStock({ page: 1, pageSize: 8 }),
  })
  const returnsQ = useQuery({
    queryKey: ['returns', 'pending'],
    queryFn: () => returnsApi.list({ page: 1, pageSize: 8, status: 0 }),
    retry: false,
  })

  const orderCols: Column<OrderSummary>[] = [
    {
      id: 'num',
      label: '№',
      render: (r) => (
        <Link component={RouterLink} to={`/orders/${r.id}`}>
          {r.orderNumber}
        </Link>
      ),
    },
    { id: 'customer', label: 'Клієнт', render: (r) => r.customerName },
    { id: 'status', label: 'Статус', render: (r) => <StatusChip label={r.statusName} status={r.statusCode} /> },
    { id: 'total', label: 'Сума', align: 'right', render: (r) => fmtMoney(r.totalAmount) },
    { id: 'at', label: 'Створено', render: (r) => fmtDateTime(r.createdAt) },
  ]

  const stockCols: Column<InventoryItem>[] = [
    { id: 'sku', label: 'SKU', render: (r) => r.sku },
    { id: 'name', label: 'Товар', render: (r) => r.productName },
    { id: 'wh', label: 'Склад', render: (r) => r.warehouseName },
    { id: 'avail', label: 'Доступно', align: 'right', render: (r) => fmtNum(r.availableQuantity) },
    {
      id: 'flag',
      label: '',
      render: (r) => (
        <StatusChip
          label={r.availableQuantity <= 0 ? 'Немає' : 'Низький'}
          status={r.availableQuantity <= 0 ? 'out' : 'low'}
        />
      ),
    },
  ]

  const returnCols: Column<ReturnSummary>[] = [
    {
      id: 'num',
      label: '№',
      render: (r) => (
        <Link component={RouterLink} to={`/returns/${r.id}`}>
          {r.returnNumber}
        </Link>
      ),
    },
    { id: 'order', label: 'Замовлення', render: (r) => r.orderNumber },
    { id: 'status', label: 'Статус', render: (r) => <StatusChip label={RETURN_STATUS[r.status] ?? String(r.status)} /> },
    { id: 'sum', label: 'Сума', align: 'right', render: (r) => fmtMoney(r.totalAmount) },
    { id: 'at', label: 'Створено', render: (r) => fmtDateTime(r.createdAt) },
  ]

  const sales = salesQ.data
  const inv = invQ.data
  const purch = purchQ.data

  return (
    <>
      <PageHeader title="Головна панель" description="Ключові показники та останні події" />
      <Tabs value={period} onChange={(_, v) => setPeriod(v as ReportPeriod)} sx={{ mb: 2 }}>
        {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
          <Tab key={p} value={p} label={PERIOD_LABELS[p]} />
        ))}
      </Tabs>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <KpiCard
          label="Продажі (завершені)"
          value={sales ? fmtMoney(sales.completedSalesTotal) : '…'}
          to="/reports"
          hint={sales ? `${fmtNum(sales.completedOrders)} замовлень` : undefined}
        />
        <KpiCard
          label="Замовлень усього"
          value={sales ? fmtNum(sales.totalOrders) : '…'}
          to="/orders"
        />
        <KpiCard
          label="Низький залишок"
          value={inv ? fmtNum(inv.lowStockSkuCount) : '…'}
          to="/inventory?lowStockOnly=true"
          hint={inv ? `${fmtNum(inv.outOfStockSkuCount)} без залишку` : undefined}
        />
        <KpiCard
          label="Закупівлі (прийом)"
          value={purch ? fmtMoney(purch.receivedPurchaseTotal) : '…'}
          to="/purchasing/purchase-orders"
          hint={purch ? `${fmtNum(purch.purchaseOrderCount)} PO` : undefined}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Останні замовлення
      </Typography>
      <DataTable
        columns={orderCols}
        rows={ordersQ.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={ordersQ.isLoading}
        error={ordersQ.error ? getErrorMessage(ordersQ.error) : null}
        onRetry={() => void ordersQ.refetch()}
        emptyTitle="Замовлень немає"
        page={1}
        pageSize={8}
        totalCount={ordersQ.data?.totalCount ?? 0}
        onPageChange={() => {}}
      />

      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Низький залишок{' '}
            <Link component={RouterLink} to="/inventory?lowStockOnly=true" variant="body2">
              Усі →
            </Link>
          </Typography>
          <DataTable
            columns={stockCols}
            rows={lowStockQ.data?.items ?? []}
            rowKey={(r) => r.id}
            loading={lowStockQ.isLoading}
            error={lowStockQ.error ? getErrorMessage(lowStockQ.error) : null}
            onRetry={() => void lowStockQ.refetch()}
            emptyTitle="Позицій з низьким залишком немає"
            page={1}
            pageSize={8}
            totalCount={lowStockQ.data?.totalCount ?? 0}
            onPageChange={() => {}}
          />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Очікують повернення{' '}
            <Link component={RouterLink} to="/returns" variant="body2">
              Усі →
            </Link>
          </Typography>
          <DataTable
            columns={returnCols}
            rows={returnsQ.data?.items ?? []}
            rowKey={(r) => r.id}
            loading={returnsQ.isLoading}
            error={returnsQ.isError ? getErrorMessage(returnsQ.error) : null}
            onRetry={() => void returnsQ.refetch()}
            emptyTitle={returnsQ.isError ? 'Фільтр повернень недоступний' : 'Заявок немає'}
            page={1}
            pageSize={8}
            totalCount={returnsQ.data?.totalCount ?? 0}
            onPageChange={() => {}}
          />
        </Box>
      </Box>
    </>
  )
}
