import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/feedback/PageHeader'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
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

type Action = 'confirm' | 'start' | 'complete' | 'cancel'

export function OrderDetailPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const [cancelComment, setCancelComment] = useState('')

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: Number.isFinite(orderId),
  })
  const { data: history = [] } = useQuery({
    queryKey: ['order-history', orderId],
    queryFn: () => ordersApi.history(orderId),
    enabled: Number.isFinite(orderId),
  })

  const mutate = useMutation({
    mutationFn: async (a: Action) => {
      if (a === 'confirm') return ordersApi.confirm(orderId)
      if (a === 'start') return ordersApi.startProcessing(orderId)
      if (a === 'complete') return ordersApi.complete(orderId)
      return ordersApi.cancel(orderId, cancelComment || undefined)
    },
    onSuccess: () => {
      enqueueSnackbar('Замовлення оновлено', { variant: 'success' })
      setAction(null)
      setCancelComment('')
      void qc.invalidateQueries({ queryKey: ['order', orderId] })
      void qc.invalidateQueries({ queryKey: ['order-history', orderId] })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!Number.isFinite(orderId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !order) return null

  const cancelled = order.statusCode === 'Cancelled'
  const completed = order.statusCode === 'Completed'
  const canConfirm = order.statusCode === 'New'
  const canStart = order.statusCode === 'Confirmed'
  const canComplete = ['Processing', 'ReadyForShipment', 'Shipped', 'Delivered'].includes(order.statusCode)
  const canCancel = !cancelled && !completed

  const actionLabels: Record<Action, { title: string; msg: string; label: string; danger?: boolean }> = {
    confirm: { title: 'Підтвердити замовлення?', msg: 'Буде зарезервовано товар на складі.', label: 'Підтвердити' },
    start: { title: 'Почати обробку?', msg: 'Замовлення перейде в обробку.', label: 'Почати обробку' },
    complete: { title: 'Завершити замовлення?', msg: 'Замовлення буде позначено як завершене.', label: 'Завершити' },
    cancel: { title: 'Скасувати замовлення?', msg: 'Резерв буде знято.', label: 'Скасувати', danger: true },
  }

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Клієнт: ${order.customerName}`}
        crumbs={[
          { label: 'Замовлення', to: '/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {canConfirm && (
              <Button variant="contained" onClick={() => setAction('confirm')}>
                Підтвердити
              </Button>
            )}
            {canStart && (
              <Button variant="contained" onClick={() => setAction('start')}>
                В обробку
              </Button>
            )}
            {canComplete && (
              <Button variant="contained" color="success" onClick={() => setAction('complete')}>
                Завершити
              </Button>
            )}
            {canCancel && (
              <Button variant="outlined" color="error" onClick={() => setAction('cancel')}>
                Скасувати
              </Button>
            )}
            <Button variant="text" onClick={() => navigate('/returns/new', { state: { orderId } })}>
              Повернення
            </Button>
          </Stack>
        }
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Позиції</Typography>
                <StatusChip label={order.statusName} status={order.statusCode} />
              </Stack>
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
              <Divider sx={{ my: 2 }} />
              <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                <Typography variant="body2">Підсумок: {fmt(order.subtotal)}</Typography>
                <Typography variant="body2">Знижка: {fmt(order.discountAmount)}</Typography>
                <Typography variant="body2">Доставка: {fmt(order.deliveryCost)}</Typography>
                <Typography variant="subtitle1">Разом: {fmt(order.totalAmount)}</Typography>
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Історія статусів
              </Typography>
              <Stack spacing={1.5}>
                {history.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Немає записів
                  </Typography>
                )}
                {history.map((h) => (
                  <Box key={h.id} sx={{ borderLeft: 2, borderColor: 'primary.main', pl: 2 }}>
                    <Typography variant="body2">
                      {h.oldStatusCode ?? '—'} → <strong>{h.newStatusCode}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDt(h.changedAt)}
                      {h.comment ? ` · ${h.comment}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Деталі
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">Склад: #{order.warehouseId}</Typography>
                <Typography variant="body2">Доставка: {DELIVERY[order.deliveryMethod] ?? order.deliveryMethod}</Typography>
                {order.deliveryAddress && <Typography variant="body2">Адреса: {order.deliveryAddress}</Typography>}
                {order.customerEmail && <Typography variant="body2">Email: {order.customerEmail}</Typography>}
                {order.customerPhone && <Typography variant="body2">Тел.: {order.customerPhone}</Typography>}
                {order.comment && <Typography variant="body2">Коментар: {order.comment}</Typography>}
                <Typography variant="body2">Створено: {fmtDt(order.createdAt)}</Typography>
                {order.confirmedAt && <Typography variant="body2">Підтверджено: {fmtDt(order.confirmedAt)}</Typography>}
                {order.completedAt && <Typography variant="body2">Завершено: {fmtDt(order.completedAt)}</Typography>}
                {order.cancelledAt && <Typography variant="body2">Скасовано: {fmtDt(order.cancelledAt)}</Typography>}
                {order.hasActiveReservation && (
                  <Typography color="warning.main">Активний резерв на складі</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <ConfirmDialog
        open={action != null && action !== 'cancel'}
        title={action ? actionLabels[action].title : ''}
        message={action ? actionLabels[action].msg : ''}
        confirmLabel={action ? actionLabels[action].label : ''}
        danger={action ? actionLabels[action].danger : false}
        loading={mutate.isPending}
        onClose={() => setAction(null)}
        onConfirm={() => action && mutate.mutate(action)}
      />
      <Dialog open={action === 'cancel'} onClose={() => !mutate.isPending && (setAction(null), setCancelComment(''))} maxWidth="xs" fullWidth>
        <DialogTitle>{actionLabels.cancel.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionLabels.cancel.msg}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Коментар"
            value={cancelComment}
            onChange={(e) => setCancelComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => (setAction(null), setCancelComment(''))} disabled={mutate.isPending}>
            Назад
          </Button>
          <Button color="error" variant="contained" onClick={() => mutate.mutate('cancel')} disabled={mutate.isPending}>
            Скасувати
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
