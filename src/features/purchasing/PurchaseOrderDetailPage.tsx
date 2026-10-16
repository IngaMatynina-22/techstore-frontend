import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
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
import { X } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { StatusChip } from '@/components/feedback/StatusChip'
import { IconAction } from '@/components/actions/IconAction'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage, newIdempotencyKey } from '@/api/client'
import { PO_STATUS, purchaseOrdersApi } from '@/api/purchasing.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const STATUS_CODE = ['Draft', 'Confirmed', 'PartiallyReceived', 'Received', 'Cancelled'] as const

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const poId = Number(id)
  const qc = useQueryClient()
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [])
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'cancel' | null>(null)
  const [cancelComment, setCancelComment] = useState('')
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({})

  const { data: po, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => purchaseOrdersApi.get(poId),
    enabled: Number.isFinite(poId),
  })

  const action = useMutation({
    mutationFn: async (kind: 'confirm' | 'cancel') => {
      if (kind === 'confirm') return purchaseOrdersApi.confirm(poId)
      return purchaseOrdersApi.cancel(poId, cancelComment || undefined)
    },
    onSuccess: () => {
      enqueueSnackbar('Оновлено', { variant: 'success' })
      setConfirmAction(null)
      setCancelComment('')
      void qc.invalidateQueries({ queryKey: ['purchase-order', poId] })
      void qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const receive = useMutation({
    mutationFn: () =>
      purchaseOrdersApi.receive(poId, {
        idempotencyKey,
        items: Object.entries(receiveQty)
          .filter(([, q]) => q > 0)
          .map(([purchaseOrderItemId, quantity]) => ({ purchaseOrderItemId: Number(purchaseOrderItemId), quantity })),
      }),
    onSuccess: () => {
      enqueueSnackbar('Прийом зареєстровано', { variant: 'success' })
      setReceiveOpen(false)
      setReceiveQty({})
      void qc.invalidateQueries({ queryKey: ['purchase-order', poId] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!Number.isFinite(poId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !po) return null

  const canConfirm = po.status === 0
  const canCancel = po.status === 0 || po.status === 1
  const canReceive = po.status === 1 || po.status === 2

  const openReceive = () => {
    const init: Record<number, number> = {}
    po.items.forEach((i) => {
      if (i.remainingQuantity > 0) init[i.id] = 0
    })
    setReceiveQty(init)
    setReceiveOpen(true)
  }

  return (
    <>
      <PageHeader
        title={po.orderNumber}
        description={
          <Link component={RouterLink} to={`/purchasing/suppliers/${po.supplierId}`}>
            {po.supplierName}
          </Link>
        }
        crumbs={[
          { label: 'Закупівлі', to: '/purchasing/purchase-orders' },
          { label: po.orderNumber },
        ]}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {canConfirm && (
              <Button variant="contained" onClick={() => setConfirmAction('confirm')}>
                Підтвердити
              </Button>
            )}
            {canReceive && (
              <Button variant="contained" color="success" onClick={openReceive}>
                Прийняти
              </Button>
            )}
            {canCancel && (
              <IconAction title="Скасувати" color="error" onClick={() => setConfirmAction('cancel')}>
                <X size={18} />
              </IconAction>
            )}
          </Stack>
        }
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">
              Склад: {po.warehouseName}
              {po.notes ? ` · ${po.notes}` : ''}
            </Typography>
            <StatusChip label={PO_STATUS[po.status] ?? String(po.status)} status={STATUS_CODE[po.status]} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">Замовлено</TableCell>
                <TableCell align="right">Прийнято</TableCell>
                <TableCell align="right">Залишок</TableCell>
                <TableCell align="right">Сума</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {po.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.productNameSnapshot}</TableCell>
                  <TableCell>{i.skuSnapshot}</TableCell>
                  <TableCell align="right">{i.orderedQuantity}</TableCell>
                  <TableCell align="right">{i.receivedQuantity}</TableCell>
                  <TableCell align="right">{i.remainingQuantity}</TableCell>
                  <TableCell align="right">{fmt(i.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="subtitle1" align="right" sx={{ mt: 2 }}>
            Разом: {fmt(po.totalAmount)}
          </Typography>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmAction === 'confirm'}
        title="Підтвердити закупівлю?"
        message="Замовлення буде відправлено постачальнику."
        loading={action.isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => action.mutate('confirm')}
      />
      <Dialog open={confirmAction === 'cancel'} onClose={() => !action.isPending && setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Скасувати закупівлю?</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Коментар"
            sx={{ mt: 1 }}
            value={cancelComment}
            onChange={(e) => setCancelComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} disabled={action.isPending}>
            Назад
          </Button>
          <Button color="error" variant="contained" onClick={() => action.mutate('cancel')} disabled={action.isPending}>
            Скасувати
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={receiveOpen} onClose={() => !receive.isPending && setReceiveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Частковий прийом</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell align="right">Залишок</TableCell>
                <TableCell align="right">Прийняти</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {po.items
                .filter((i) => i.remainingQuantity > 0)
                .map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.productNameSnapshot}</TableCell>
                    <TableCell align="right">{i.remainingQuantity}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, max: i.remainingQuantity } }}
                        value={receiveQty[i.id] ?? 0}
                        onChange={(e) =>
                          setReceiveQty((prev) => ({ ...prev, [i.id]: Math.min(i.remainingQuantity, Number(e.target.value)) }))
                        }
                        sx={{ width: 88 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveOpen(false)} disabled={receive.isPending}>
            Закрити
          </Button>
          <Button
            variant="contained"
            disabled={receive.isPending || !Object.values(receiveQty).some((q) => q > 0)}
            onClick={() => receive.mutate()}
          >
            Зареєструвати
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
