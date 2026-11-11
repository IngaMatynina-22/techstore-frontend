import { useState } from 'react'
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage, newIdempotencyKey } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { useCart } from '@/features/customer/cart'
import type { DeliveryMethod } from '@/types/api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: 0, label: 'Самовивіз' },
  { value: 1, label: 'Курʼєр' },
  { value: 2, label: 'Нова Пошта' },
  { value: 3, label: 'Інше' },
]

export function CustomerCartPage() {
  const navigate = useNavigate()
  const { items, total, setQuantity, removeItem, clear } = useCart()
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey())
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(1)
  const [comment, setComment] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const checkout = useMutation({
    mutationFn: () => {
      if (items.length === 0) throw new Error('Кошик порожній')
      if (deliveryMethod !== 0 && !deliveryAddress.trim()) {
        throw new Error('Вкажіть адресу доставки')
      }
      if (deliveryMethod !== 0 && !customerPhone.trim()) {
        throw new Error('Вкажіть контактний номер телефону')
      }
      return ordersApi.create({
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerComment: comment || undefined,
        idempotencyKey,
        items: items.map((i) => ({
          productVariantId: i.variantId,
          quantity: i.quantity,
        })),
      })
    },
    onSuccess: (o) => {
      clear()
      enqueueSnackbar('Замовлення створено', { variant: 'success' })
      navigate(`/app/orders/${o.id}`)
    },
    onError: (e) => {
      setIdempotencyKey(newIdempotencyKey())
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    },
  })

  return (
    <>
      <PageHeader title="Кошик" description="Оформлення замовлення" />

      {items.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Кошик порожній
          </Typography>
          <Button variant="contained" component={RouterLink} to="/app/catalog">
            До каталогу
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Склад відправлення визначить менеджер після перевірки замовлення та наявності товару.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell align="right">Ціна</TableCell>
                  <TableCell align="right">К-сть</TableCell>
                  <TableCell align="right">Наявність</TableCell>
                  <TableCell align="right">Сума</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => {
                  return (
                    <TableRow key={i.variantId}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{i.productName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {i.variantName} · {i.sku}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmt(i.unitPrice)}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={i.quantity}
                          slotProps={{ htmlInput: { min: 1 } }}
                          onChange={(e) => setQuantity(i.variantId, Math.max(1, Number(e.target.value) || 1))}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          Перевірить менеджер
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmt(i.unitPrice * i.quantity)}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => removeItem(i.variantId)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <Typography sx={{ mt: 2, pr: 1, fontWeight: 700, textAlign: 'right' }}>
              Разом: {fmt(total)}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, maxWidth: 480 }}>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Доставка</InputLabel>
                <Select
                  label="Доставка"
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(Number(e.target.value) as DeliveryMethod)}
                >
                  {DELIVERY_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {deliveryMethod !== 0 && (
                <>
                  <TextField
                    label="Адреса доставки / відділення"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                  <TextField
                    label="Контактний телефон"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </>
              )}
              <TextField
                label="Коментар до замовлення"
                multiline
                minRows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                variant="contained"
                size="large"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate()}
              >
                Оформити замовлення
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}
    </>
  )
}
