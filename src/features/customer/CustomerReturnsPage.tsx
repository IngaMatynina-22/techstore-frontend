import { useMemo } from 'react'
import { Button } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { useUrlState } from '@/hooks/useUrlState'
import { getErrorMessage } from '@/api/client'
import { RETURN_STATUS, returnsApi, type ReturnSummary } from '@/api/returns.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')

const STATUS_CODE = ['Requested', 'Approved', 'Rejected', 'Received', 'Restocked', 'Closed'] as const

export function CustomerReturnsPage() {
  const navigate = useNavigate()
  const { page, pageSize, setMany } = useUrlState()
  const listParams = useMemo(() => ({ page, pageSize }), [page, pageSize])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-returns', listParams],
    queryFn: () => returnsApi.list(listParams),
  })

  const columns: Column<ReturnSummary>[] = [
    {
      id: 'num',
      label: 'Номер',
      render: (r) => (
        <RouterLink to={`/app/returns/${r.id}`} style={{ color: 'inherit' }}>
          {r.returnNumber}
        </RouterLink>
      ),
    },
    {
      id: 'order',
      label: 'Замовлення',
      render: (r) => (
        <RouterLink to={`/app/orders/${r.orderId}`} style={{ color: 'inherit' }}>
          {r.orderNumber}
        </RouterLink>
      ),
    },
    {
      id: 'status',
      label: 'Статус',
      render: (r) => (
        <StatusChip label={RETURN_STATUS[r.status] ?? String(r.status)} status={STATUS_CODE[r.status]} />
      ),
    },
    { id: 'total', label: 'Сума', align: 'right', render: (r) => fmt(r.totalAmount) },
    { id: 'created', label: 'Створено', render: (r) => fmtDt(r.createdAt) },
  ]

  return (
    <>
      <PageHeader
        title="Повернення"
        description="Ваші заявки на повернення"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} component={RouterLink} to="/app/returns/new">
            Нове повернення
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
        emptyTitle="Повернень не знайдено"
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => setMany({ pageSize: s, page: 1 })}
        onRowClick={(r) => navigate(`/app/returns/${r.id}`)}
      />
    </>
  )
}
