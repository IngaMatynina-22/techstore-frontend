import { useMemo } from 'react'
import { Button } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { useUrlState } from '@/hooks/useUrlState'
import { useTablePrefs } from '@/hooks/useTablePrefs'
import { getErrorMessage } from '@/api/client'
import { PO_STATUS, purchaseOrdersApi, type PurchaseOrderSummary } from '@/api/purchasing.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')

const STATUS_CODE = ['Draft', 'Confirmed', 'PartiallyReceived', 'Received', 'Cancelled'] as const

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const { params, get, page, pageSize, setMany } = useUrlState()
  const { prefs, setPageSize: persistPageSize, toggleColumn } = useTablePrefs('purchase-orders')
  const effectivePageSize = params.has('pageSize') ? pageSize : prefs.pageSize
  const status = get('status')
  const listParams = useMemo(
    () => ({
      page,
      pageSize: effectivePageSize,
      status: status !== '' && status != null ? Number(status) : undefined,
    }),
    [page, effectivePageSize, status],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-orders', listParams],
    queryFn: () => purchaseOrdersApi.list(listParams),
  })

  const columns: Column<PurchaseOrderSummary>[] = [
    {
      id: 'num',
      label: 'Номер',
      render: (r) => (
        <RouterLink to={`/purchasing/purchase-orders/${r.id}`} style={{ color: 'inherit' }}>
          {r.orderNumber}
        </RouterLink>
      ),
    },
    { id: 'supplier', label: 'Постачальник', render: (r) => r.supplierName },
    { id: 'warehouse', label: 'Склад', render: (r) => r.warehouseName },
    {
      id: 'status',
      label: 'Статус',
      render: (r) => (
        <StatusChip label={PO_STATUS[r.status] ?? String(r.status)} status={STATUS_CODE[r.status]} />
      ),
    },
    { id: 'items', label: 'Поз.', align: 'center', render: (r) => r.itemCount },
    { id: 'total', label: 'Сума', align: 'right', render: (r) => fmt(r.totalAmount) },
    { id: 'created', label: 'Створено', render: (r) => fmtDt(r.createdAt) },
  ]

  return (
    <>
      <PageHeader
        title="Закупівлі"
        description="Замовлення постачальникам"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            component={RouterLink}
            to="/purchasing/purchase-orders/new"
          >
            Нова закупівля
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Закупівель не знайдено"
        page={page}
        pageSize={effectivePageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => {
          persistPageSize(s)
          setMany({ pageSize: s, page: 1 })
        }}
        onRowClick={(r) => navigate(`/purchasing/purchase-orders/${r.id}`)}
        hiddenColumnIds={prefs.hiddenColumns}
        onToggleColumn={toggleColumn}
      />
    </>
  )
}
