import { Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/feedback/PageHeader'
import { StatusChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { DISPOSITION, RETURN_STATUS, returnsApi } from '@/api/returns.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')
const STATUS_CODE = ['Requested', 'Approved', 'Rejected', 'Received', 'Restocked', 'Closed'] as const

export function CustomerReturnDetailPage() {
  const { id } = useParams()
  const returnId = Number(id)

  const { data: ret, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-return', returnId],
    queryFn: () => returnsApi.get(returnId),
    enabled: Number.isFinite(returnId),
  })

  if (!Number.isFinite(returnId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !ret) return null

  return (
    <>
      <PageHeader
        title={ret.returnNumber}
        crumbs={[{ label: 'Повернення', to: '/app/returns' }, { label: ret.returnNumber }]}
      />
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography color="text.secondary">Статус:</Typography>
            <StatusChip
              label={RETURN_STATUS[ret.status] ?? String(ret.status)}
              status={STATUS_CODE[ret.status]}
            />
          </Stack>
          <Typography variant="body2">Замовлення: {ret.orderNumber}</Typography>
          <Typography variant="body2">Створено: {fmtDt(ret.createdAt)}</Typography>
          {ret.customerComment && <Typography variant="body2">Коментар: {ret.customerComment}</Typography>}
          <Typography sx={{ fontWeight: 700 }}>Сума: {fmt(ret.totalAmount)}</Typography>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
          Позиції
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">К-сть</TableCell>
              <TableCell>Причина</TableCell>
              <TableCell>Disposition</TableCell>
              <TableCell align="right">Сума</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ret.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.productNameSnapshot}</TableCell>
                <TableCell>{i.skuSnapshot}</TableCell>
                <TableCell align="right">{i.quantity}</TableCell>
                <TableCell>{i.reasonCode || '—'}</TableCell>
                <TableCell>{DISPOSITION[i.disposition] ?? i.disposition}</TableCell>
                <TableCell align="right">{fmt(i.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  )
}
