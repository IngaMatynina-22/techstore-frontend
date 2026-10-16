import { useEffect, useState } from 'react'
import {
  Button,
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
import { useMutation, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { returnsApi } from '@/api/returns.api'

type LineState = {
  orderItemId: number
  label: string
  maxQty: number
  quantity: number
  reasonCode: string
}

export function CustomerReturnCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const presetOrderId = (location.state as { orderId?: number } | null)?.orderId
  const [orderId, setOrderId] = useState<number | ''>(presetOrderId ?? '')
  const [customerComment, setCustomerComment] = useState('')
  const [lines, setLines] = useState<LineState[]>([])

  const { data: order, isFetching } = useQuery({
    queryKey: ['customer-order-for-return', orderId],
    queryFn: () => ordersApi.get(Number(orderId)),
    enabled: Number(orderId) > 0,
  })

  useEffect(() => {
    if (!order) {
      setLines([])
      return
    }
    setLines(
      order.items.map((i) => ({
        orderItemId: i.id,
        label: `${i.productName}${i.variantName ? ` · ${i.variantName}` : ''} (${i.sku})`,
        maxQty: i.quantity,
        quantity: 0,
        reasonCode: '',
      })),
    )
  }, [order])

  const create = useMutation({
    mutationFn: () => {
      const items = lines
        .filter((l) => l.quantity > 0)
        .map((l) => ({
          orderItemId: l.orderItemId,
          quantity: l.quantity,
          disposition: 0,
          reasonCode: l.reasonCode || undefined,
        }))
      if (!orderId || items.length === 0) throw new Error('Оберіть позиції для повернення')
      return returnsApi.create({
        orderId: Number(orderId),
        customerComment: customerComment || undefined,
        items,
      })
    },
    onSuccess: (r) => {
      enqueueSnackbar('Заявку на повернення створено', { variant: 'success' })
      navigate(`/app/returns/${r.id}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  return (
    <>
      <PageHeader
        title="Нове повернення"
        crumbs={[{ label: 'Повернення', to: '/app/returns' }, { label: 'Створення' }]}
      />
      <Paper sx={{ p: 3, maxWidth: 960 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              label="ID замовлення"
              type="number"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value ? Number(e.target.value) : '')}
              sx={{ minWidth: 160 }}
            />
            {order && (
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                {order.orderNumber} · {order.statusName}
              </Typography>
            )}
          </Stack>
          {isFetching && <Typography variant="body2">Завантаження позицій…</Typography>}
          {lines.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Позиція</TableCell>
                  <TableCell align="right">Макс.</TableCell>
                  <TableCell align="right">К-сть</TableCell>
                  <TableCell>Причина</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={l.orderItemId}>
                    <TableCell>{l.label}</TableCell>
                    <TableCell align="right">{l.maxQty}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, max: l.maxQty } }}
                        value={l.quantity}
                        onChange={(e) => {
                          const q = Math.min(l.maxQty, Math.max(0, Number(e.target.value)))
                          setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, quantity: q } : row)))
                        }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={l.reasonCode}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, reasonCode: e.target.value } : row)),
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <TextField
            label="Коментар"
            multiline
            minRows={2}
            value={customerComment}
            onChange={(e) => setCustomerComment(e.target.value)}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending || !orderId}>
              Створити заявку
            </Button>
            <Button onClick={() => navigate('/app/returns')}>Скасувати</Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  )
}
