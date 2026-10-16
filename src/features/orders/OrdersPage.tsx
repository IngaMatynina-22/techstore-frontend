import { useMemo, useState } from 'react'
import { Button, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { useUrlState } from '@/hooks/useUrlState'
import { useTablePrefs } from '@/hooks/useTablePrefs'
import { getErrorMessage } from '@/api/client'
import { ordersApi, type OrderSummary } from '@/api/orders.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')

const STATUS_OPTIONS = [
  { value: '', label: 'Усі' },
  { value: 'New', label: 'Нове' },
  { value: 'Confirmed', label: 'Підтверджено' },
  { value: 'Processing', label: 'В обробці' },
  { value: 'ReadyForShipment', label: 'До відправки' },
  { value: 'Shipped', label: 'Відправлено' },
  { value: 'Delivered', label: 'Доставлено' },
  { value: 'Completed', label: 'Завершено' },
  { value: 'Cancelled', label: 'Скасовано' },
]

export function OrdersPage() {
  const navigate = useNavigate()
  const { params, get, page, pageSize, setMany } = useUrlState()
  const { prefs, setPageSize: persistPageSize, toggleColumn } = useTablePrefs('orders')
  const effectivePageSize = params.has('pageSize') ? pageSize : prefs.pageSize
  const statusCode = get('statusCode')
  const orderNumber = get('orderNumber')
  const fromUtc = get('fromUtc')
  const toUtc = get('toUtc')
  const [draftNumber, setDraftNumber] = useState(orderNumber)

  const listParams = useMemo(
    () => ({
      page,
      pageSize: effectivePageSize,
      statusCode: statusCode || undefined,
      orderNumber: orderNumber || undefined,
      fromUtc: fromUtc || undefined,
      toUtc: toUtc || undefined,
    }),
    [page, effectivePageSize, statusCode, orderNumber, fromUtc, toUtc],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', listParams],
    queryFn: () => ordersApi.list(listParams),
  })

  const columns: Column<OrderSummary>[] = [
    {
      id: 'num',
      label: 'Номер',
      render: (r) => (
        <RouterLink to={`/orders/${r.id}`} style={{ color: 'inherit' }}>
          {r.orderNumber}
        </RouterLink>
      ),
    },
    { id: 'customer', label: 'Клієнт', render: (r) => r.customerName },
    { id: 'status', label: 'Статус', render: (r) => <StatusChip label={r.statusName} status={r.statusCode} /> },
    { id: 'total', label: 'Сума', align: 'right', render: (r) => fmt(r.totalAmount) },
    { id: 'created', label: 'Створено', render: (r) => fmtDt(r.createdAt) },
  ]

  return (
    <>
      <PageHeader
        title="Замовлення"
        description="Продажі та обробка замовлень"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} component={RouterLink} to="/orders/new">
            Нове замовлення
          </Button>
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="Номер замовлення"
          value={draftNumber}
          onChange={(e) => setDraftNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setMany({ orderNumber: draftNumber, page: 1 })}
          sx={{ minWidth: 160, flex: '1 1 140px' }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Статус</InputLabel>
          <Select label="Статус" value={statusCode} onChange={(e) => setMany({ statusCode: e.target.value, page: 1 })}>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Від (UTC)"
          type="datetime-local"
          value={fromUtc ? fromUtc.slice(0, 16) : ''}
          onChange={(e) => setMany({ fromUtc: e.target.value ? `${e.target.value}:00.000Z` : null, page: 1 })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="До (UTC)"
          type="datetime-local"
          value={toUtc ? toUtc.slice(0, 16) : ''}
          onChange={(e) => setMany({ toUtc: e.target.value ? `${e.target.value}:00.000Z` : null, page: 1 })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <IconButton color="primary" aria-label="Знайти" onClick={() => setMany({ orderNumber: draftNumber, page: 1 })}>
          <Search size={18} />
        </IconButton>
      </Stack>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Замовлень не знайдено"
        page={page}
        pageSize={effectivePageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => {
          persistPageSize(s)
          setMany({ pageSize: s, page: 1 })
        }}
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
        hiddenColumnIds={prefs.hiddenColumns}
        onToggleColumn={toggleColumn}
      />
    </>
  )
}
