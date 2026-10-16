import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage, newIdempotencyKey } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { inventoryApi, warehousesApi } from '@/api/inventory.api'
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
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(1)
  const [comment, setComment] = useState('')
  const [autoPicked, setAutoPicked] = useState(false)

  const { data: warehouses = [] } = useQuery({
    queryKey: ['customer-warehouses'],
    queryFn: () => warehousesApi.list(false),
  })

  const activeWarehouses = warehouses.filter((w) => w.isActive)
  const effectiveWarehouseId = warehouseId || activeWarehouses[0]?.id || ''

  const stockQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['customer-stock', item.variantId],
      queryFn: () =>
        inventoryApi.list({
          variantId: item.variantId,
          page: 1,
          pageSize: 50,
        }),
      enabled: items.length > 0,
    })),
  })

  const availabilityByVariant = useMemo(() => {
    const map = new Map<number, { warehouseId: number; warehouseName: string; available: number }[]>()
    items.forEach((item, idx) => {
      const rows = stockQueries[idx]?.data?.items ?? []
      map.set(
        item.variantId,
        rows
          .filter((r) => r.availableQuantity > 0)
          .map((r) => ({
            warehouseId: r.warehouseId,
            warehouseName: r.warehouseName,
            available: r.availableQuantity,
          })),
      )
    })
    return map
  }, [items, stockQueries])

  const availableAtSelected = useMemo(() => {
    const wid = Number(effectiveWarehouseId)
    if (!wid) return new Map<number, number>()
    const map = new Map<number, number>()
    for (const item of items) {
      const row = availabilityByVariant.get(item.variantId)?.find((a) => a.warehouseId === wid)
      map.set(item.variantId, row?.available ?? 0)
    }
    return map
  }, [items, effectiveWarehouseId, availabilityByVariant])

  const stockOk = items.every((i) => (availableAtSelected.get(i.variantId) ?? 0) >= i.quantity)
  const stockLoading = stockQueries.some((q) => q.isLoading || q.isFetching)

  // Prefer a warehouse that can fulfill the whole cart
  useEffect(() => {
    if (autoPicked || !activeWarehouses.length || items.length === 0 || stockLoading) return
    const candidate = activeWarehouses.find((w) =>
      items.every((item) => {
        const avail =
          availabilityByVariant.get(item.variantId)?.find((a) => a.warehouseId === w.id)?.available ?? 0
        return avail >= item.quantity
      }),
    )
    if (candidate) {
      setWarehouseId(candidate.id)
      setAutoPicked(true)
    }
  }, [activeWarehouses, items, availabilityByVariant, stockLoading, autoPicked])

  const checkout = useMutation({
    mutationFn: () => {
      if (!effectiveWarehouseId) throw new Error('Оберіть склад')
      if (items.length === 0) throw new Error('Кошик порожній')
      if (!stockOk) {
        throw new Error('Недостатньо залишку на обраному складі. Оберіть інший склад або зменшіть кількість.')
      }
      return ordersApi.create({
        warehouseId: Number(effectiveWarehouseId),
        deliveryMethod,
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
          {!stockLoading && !stockOk && (
            <Alert severity="warning">
              На обраному складі недостатньо товару. Змініть склад або зменшіть кількість. Якщо залишку немає
              ніде — спочатку потрібно оприбуткувати товар на складі (персонал).
            </Alert>
          )}

          <Paper sx={{ p: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell align="right">Ціна</TableCell>
                  <TableCell align="right">К-сть</TableCell>
                  <TableCell align="right">Доступно</TableCell>
                  <TableCell align="right">Сума</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => {
                  const avail = availableAtSelected.get(i.variantId) ?? 0
                  const over = avail < i.quantity
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
                          slotProps={{ htmlInput: { min: 1, max: Math.max(1, avail) || undefined } }}
                          onChange={(e) => setQuantity(i.variantId, Math.max(1, Number(e.target.value) || 1))}
                          sx={{ width: 80 }}
                          error={over}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={over ? 'error' : 'text.secondary'}>
                          {stockLoading ? '…' : avail}
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
                <InputLabel>Склад / пункт видачі</InputLabel>
                <Select
                  label="Склад / пункт видачі"
                  value={effectiveWarehouseId}
                  onChange={(e) => {
                    setWarehouseId(Number(e.target.value))
                    setAutoPicked(true)
                  }}
                >
                  {activeWarehouses.map((w) => {
                    const canFulfill = items.every((item) => {
                      const avail =
                        availabilityByVariant.get(item.variantId)?.find((a) => a.warehouseId === w.id)
                          ?.available ?? 0
                      return avail >= item.quantity
                    })
                    return (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name}
                        {canFulfill ? '' : ' (немає залишку)'}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
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
                disabled={checkout.isPending || !effectiveWarehouseId || !stockOk || stockLoading}
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
