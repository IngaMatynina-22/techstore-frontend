import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/feedback/PageHeader'
import { StatusChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { ordersApi } from '@/api/orders.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')

const DELIVERY: Record<number, string> = {
  0: 'Самовивіз',
  1: 'Курʼєр',
  2: 'Нова Пошта',
  3: 'Інше',
}

export function CustomerOrderDetailPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const qc = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelComment, setCancelComment] = useState('')

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: Number.isFinite(orderId),
  })

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(orderId, cancelComment || undefined),
    onSuccess: () => {
      enqueueSnackbar('Замовлення скасовано', { variant: 'success' })
      setCancelOpen(false)
      setCancelComment('')
      void qc.invalidateQueries({ queryKey: ['customer-order', orderId] })
      void qc.invalidateQueries({ queryKey: ['customer-orders'] })
      void qc.invalidateQueries({ queryKey: ['customer-orders-home'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!Number.isFinite(orderId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !order) return null

  const canCancel = order.statusCode === 'New' || order.statusCode === 'Confirmed'

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        crumbs={[{ label: 'Мої замовлення', to: '/app/orders' }, { label: order.orderNumber }]}
        actions={
          <Stack direction="row" spacing={1}>
            {canCancel && (
              <Button color="error" variant="outlined" onClick={() => setCancelOpen(true)}>
                Скасувати
              </Button>
            )}
            <Button
              variant="outlined"
              component={RouterLink}
              to="/app/returns/new"
              state={{ orderId: order.id }}
            >
              Повернення
            </Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography color="text.secondary">Статус:</Typography>
            <StatusChip label={order.statusName} status={order.statusCode} />
          </Stack>
          <Typography variant="body2">Створено: {fmtDt(order.createdAt)}</Typography>
          <Typography variant="body2">Доставка: {DELIVERY[order.deliveryMethod] ?? '—'}</Typography>
          {order.comment && <Typography variant="body2">Коментар: {order.comment}</Typography>}
          <Typography sx={{ fontWeight: 700 }}>Разом: {fmt(order.totalAmount)}</Typography>
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
              <TableCell align="right">Ціна</TableCell>
              <TableCell align="right">Сума</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  {i.productName}
                  {i.variantName ? ` · ${i.variantName}` : ''}
                </TableCell>
                <TableCell>{i.sku}</TableCell>
                <TableCell align="right">{i.quantity}</TableCell>
                <TableCell align="right">{fmt(i.unitPrice)}</TableCell>
                <TableCell align="right">{fmt(i.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Скасувати замовлення?</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Коментар (необовʼязково)"
            multiline
            minRows={2}
            value={cancelComment}
            onChange={(e) => setCancelComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Ні</Button>
          <Button color="error" variant="contained" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            Скасувати замовлення
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
