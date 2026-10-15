import { useState } from 'react'
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
import { PageHeader } from '@/components/feedback/PageHeader'
import { StatusChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { DISPOSITION, RETURN_STATUS, returnsApi } from '@/api/returns.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const STATUS_CODE = ['Requested', 'Approved', 'Rejected', 'Received', 'Restocked', 'Closed'] as const

type Workflow = 'approve' | 'reject' | 'receive' | 'apply-inventory' | 'close'

export function ReturnDetailPage() {
  const { id } = useParams()
  const returnId = Number(id)
  const qc = useQueryClient()
  const [action, setAction] = useState<Workflow | null>(null)
  const [comment, setComment] = useState('')

  const { data: ret, isLoading, error, refetch } = useQuery({
    queryKey: ['return', returnId],
    queryFn: () => returnsApi.get(returnId),
    enabled: Number.isFinite(returnId),
  })

  const workflow = useMutation({
    mutationFn: async (a: Workflow) => {
      const c = comment || undefined
      if (a === 'approve') return returnsApi.approve(returnId, c)
      if (a === 'reject') return returnsApi.reject(returnId, c)
      if (a === 'receive') return returnsApi.receive(returnId, c)
      if (a === 'apply-inventory') return returnsApi.applyInventory(returnId, c)
      return returnsApi.close(returnId, c)
    },
    onSuccess: () => {
      enqueueSnackbar('Оновлено', { variant: 'success' })
      setAction(null)
      setComment('')
      void qc.invalidateQueries({ queryKey: ['return', returnId] })
      void qc.invalidateQueries({ queryKey: ['returns'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!Number.isFinite(returnId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !ret) return null

  const labels: Record<Workflow, string> = {
    approve: 'Схвалити',
    reject: 'Відхилити',
    receive: 'Прийняти на склад',
    'apply-inventory': 'Застосувати на залишки',
    close: 'Закрити',
  }

  return (
    <>
      <PageHeader
        title={ret.returnNumber}
        description={
          <>
            Замовлення{' '}
            <Link component={RouterLink} to={`/orders/${ret.orderId}`}>
              {ret.orderNumber}
            </Link>
            {` · ${ret.customerName}`}
          </>
        }
        crumbs={[{ label: 'Повернення', to: '/returns' }, { label: ret.returnNumber }]}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {ret.status === 0 && (
              <>
                <Button variant="contained" onClick={() => setAction('approve')}>
                  Схвалити
                </Button>
                <Button variant="outlined" color="error" onClick={() => setAction('reject')}>
                  Відхилити
                </Button>
              </>
            )}
            {ret.status === 1 && (
              <Button variant="contained" onClick={() => setAction('receive')}>
                Прийняти
              </Button>
            )}
            {ret.status === 3 && !ret.inventoryApplied && (
              <Button variant="contained" onClick={() => setAction('apply-inventory')}>
                На залишки
              </Button>
            )}
            {(ret.status === 4 || (ret.status === 3 && ret.inventoryApplied)) && (
              <Button variant="contained" color="success" onClick={() => setAction('close')}>
                Закрити
              </Button>
            )}
          </Stack>
        }
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">{ret.customerComment ?? ret.staffComment ?? '—'}</Typography>
            <StatusChip label={RETURN_STATUS[ret.status] ?? String(ret.status)} status={STATUS_CODE[ret.status]} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">К-сть</TableCell>
                <TableCell>Обробка</TableCell>
                <TableCell align="right">Сума</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ret.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.productNameSnapshot}</TableCell>
                  <TableCell>{i.skuSnapshot}</TableCell>
                  <TableCell align="right">{i.quantity}</TableCell>
                  <TableCell>{DISPOSITION[i.disposition] ?? i.disposition}</TableCell>
                  <TableCell align="right">{fmt(i.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="subtitle1" align="right" sx={{ mt: 2 }}>
            Разом: {fmt(ret.totalAmount)}
          </Typography>
        </CardContent>
      </Card>
      {ret.statusHistory?.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Історія
            </Typography>
            <Stack spacing={1}>
              {ret.statusHistory.map((h) => (
                <Typography key={h.id} variant="body2" color="text.secondary">
                  {h.oldStatus != null ? RETURN_STATUS[h.oldStatus] : '—'} → {RETURN_STATUS[h.newStatus]} ·{' '}
                  {new Date(h.changedAt).toLocaleString('uk-UA')}
                  {h.comment ? ` · ${h.comment}` : ''}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
      <Dialog
        open={action != null}
        onClose={() => !workflow.isPending && (setAction(null), setComment(''))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{action ? labels[action] : ''}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Коментар (необовʼязково)"
            sx={{ mt: 1 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => (setAction(null), setComment(''))} disabled={workflow.isPending}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color={action === 'reject' ? 'error' : 'primary'}
            disabled={workflow.isPending || !action}
            onClick={() => action && workflow.mutate(action)}
          >
            {action ? labels[action] : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
