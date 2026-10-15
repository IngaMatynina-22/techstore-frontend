import { useMemo } from 'react'
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
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage, newIdempotencyKey } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { inventoryApi, warehousesApi } from '@/api/inventory.api'
import type { DeliveryMethod } from '@/types/api'

const schema = z.object({
  warehouseId: z.coerce.number().positive('Оберіть склад'),
  customerId: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  deliveryMethod: z.coerce.number().min(0).max(3),
  comment: z.string().optional(),
  items: z.array(z.object({ variantId: z.coerce.number().positive(), quantity: z.coerce.number().int().min(1) })).min(1),
})

type FormValues = z.infer<typeof schema>

export function OrderCreatePage() {
  const navigate = useNavigate()
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [])
  const { control, register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      warehouseId: '' as unknown as number,
      customerId: '',
      deliveryMethod: 0,
      comment: '',
      items: [{ variantId: '' as unknown as number, quantity: 1 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const warehouseId = watch('warehouseId')

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const { data: stock } = useQuery({
    queryKey: ['inventory-pick', warehouseId],
    queryFn: () => inventoryApi.list({ warehouseId, page: 1, pageSize: 200 }),
    enabled: Number(warehouseId) > 0,
  })

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      ordersApi.create({
        warehouseId: values.warehouseId,
        customerId: values.customerId ? Number(values.customerId) : undefined,
        deliveryMethod: values.deliveryMethod as DeliveryMethod,
        comment: values.comment || undefined,
        idempotencyKey,
        items: values.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      }),
    onSuccess: (o) => {
      enqueueSnackbar('Замовлення створено', { variant: 'success' })
      navigate(`/orders/${o.id}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const variants = stock?.items ?? []

  return (
    <>
      <PageHeader
        title="Нове замовлення"
        crumbs={[{ label: 'Замовлення', to: '/orders' }, { label: 'Створення' }]}
      />
      <Paper sx={{ p: 3, maxWidth: 960 }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit((v) => create.mutate(v))}>
          <Stack  spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Controller
              name="warehouseId"
              control={control}
              render={({ field }) => (
                <FormControl size="small" sx={{ minWidth: 200 }} error={!!errors.warehouseId}>
                  <InputLabel>Склад</InputLabel>
                  <Select label="Склад" value={field.value ?? ''} onChange={field.onChange}>
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <TextField size="small" label="ID клієнта (необовʼязково)" type="number" {...register('customerId')} />
            <Controller
              name="deliveryMethod"
              control={control}
              render={({ field }) => (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Доставка</InputLabel>
                  <Select label="Доставка" value={field.value} onChange={field.onChange}>
                    <MenuItem value={0}>Самовивіз</MenuItem>
                    <MenuItem value={1}>Курʼєр</MenuItem>
                    <MenuItem value={2}>Нова Пошта</MenuItem>
                    <MenuItem value={3}>Інше</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <TextField size="small" label="Коментар" fullWidth sx={{ flex: 1 }} {...register('comment')} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Варіант</TableCell>
                <TableCell width={120}>К-сть</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((f, idx) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Controller
                      name={`items.${idx}.variantId`}
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small">
                          <InputLabel>SKU / варіант</InputLabel>
                          <Select label="SKU / варіант" value={field.value ?? ''} onChange={field.onChange} disabled={!warehouseId}>
                            {variants.map((v) => (
                              <MenuItem key={v.variantId} value={v.variantId}>
                                {v.sku} · {v.productName} ({v.availableQuantity} дост.)
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" {...register(`items.${idx}.quantity`)} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => remove(idx)} disabled={fields.length <= 1}>
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button startIcon={<Plus size={16} />} onClick={() => append({ variantId: '' as unknown as number, quantity: 1 })}>
            Позиція
          </Button>
          {errors.items && (
            <Typography component="span" variant="caption" color="error">
              {errors.items.message ?? 'Додайте позиції'}
            </Typography>
          )}
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={isSubmitting || create.isPending}>
              Створити
            </Button>
            <Button onClick={() => navigate('/orders')}>Скасувати</Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  )
}
