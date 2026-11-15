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
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage, newIdempotencyKey } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { inventoryApi, warehousesApi } from '@/api/inventory.api'
import { customerLabel, customersApi } from '@/api/customers.api'
import type { DeliveryMethod } from '@/types/api'

const schema = z.object({
  customerId: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  deliveryMethod: z.coerce.number().min(0).max(3),
  comment: z.string().optional(),
  deliveryAddress: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(z.object({
    variantId: z.coerce.number().positive('Оберіть товар'),
    warehouseId: z.coerce.number().positive('Оберіть склад'),
    quantity: z.coerce.number().int().min(1),
  })).min(1),
}).superRefine((values, ctx) => {
  if (values.deliveryMethod !== 0 && !values.deliveryAddress?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['deliveryAddress'], message: 'Вкажіть адресу доставки' })
  }
  if (values.deliveryMethod !== 0 && !values.customerPhone?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['customerPhone'], message: 'Вкажіть контактний телефон' })
  }
})

type FormValues = z.infer<typeof schema>

export function OrderCreatePage() {
  const navigate = useNavigate()
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [])
  const { control, register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      customerId: '',
      deliveryMethod: 0,
      comment: '',
      deliveryAddress: '',
      customerPhone: '',
      items: [{ variantId: '' as unknown as number, warehouseId: '' as unknown as number, quantity: 1 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' })
  const selectedWarehouseIds = useMemo(
    () => [...new Set((watchedItems ?? []).map((item) => Number(item.warehouseId)).filter((id) => id > 0))],
    [watchedItems],
  )

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list(false) })
  const stockQueries = useQueries({
    queries: selectedWarehouseIds.map((warehouseId) => ({
      queryKey: ['inventory-pick', warehouseId],
      queryFn: () => inventoryApi.list({ warehouseId, page: 1, pageSize: 200 }),
    })),
  })
  const stockByWarehouse = new Map(
    selectedWarehouseIds.map((warehouseId, index) => [
      warehouseId,
      stockQueries[index]?.data?.items.filter((item) => item.availableQuantity > 0) ?? [],
    ]),
  )
  const { data: customersPage } = useQuery({
    queryKey: ['customers', 'order-create'],
    queryFn: () => customersApi.list({ page: 1, pageSize: 200, includeInactive: false }),
  })
  const customers = customersPage?.items ?? []
  const create = useMutation({
    mutationFn: (values: FormValues) =>
      ordersApi.create({
        customerId: values.customerId ? Number(values.customerId) : undefined,
        deliveryMethod: values.deliveryMethod as DeliveryMethod,
        customerComment: values.comment || undefined,
        deliveryAddress: values.deliveryAddress?.trim() || undefined,
        customerPhone: values.customerPhone?.trim() || undefined,
        idempotencyKey,
        items: values.items.map((i) => ({
          productVariantId: i.variantId,
          quantity: i.quantity,
          warehouseId: i.warehouseId,
        })),
      }),
    onSuccess: (o) => {
      enqueueSnackbar('Замовлення створено', { variant: 'success' })
      navigate(`/orders/${o.id}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  return (
    <>
      <PageHeader
        title="Нове замовлення"
        crumbs={[{ label: 'Замовлення', to: '/orders' }, { label: 'Створення' }]}
      />
      <Paper sx={{ p: 3, maxWidth: 960 }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit((v) => create.mutate(v))}>
          <Stack spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Для кожної позиції можна обрати окремий склад відправлення.
            </Typography>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel>Клієнт</InputLabel>
                  <Select
                    label="Клієнт"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  >
                    <MenuItem value="">
                      <em>Без клієнта</em>
                    </MenuItem>
                    {customers.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {customerLabel(c)} · {c.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
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
            <TextField
              size="small"
              label="Адреса доставки / відділення"
              fullWidth
              error={!!errors.deliveryAddress}
              helperText={errors.deliveryAddress?.message}
              {...register('deliveryAddress')}
            />
            <TextField
              size="small"
              label="Телефон для доставки"
              type="tel"
              fullWidth
              error={!!errors.customerPhone}
              helperText={errors.customerPhone?.message}
              {...register('customerPhone')}
            />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                  <TableCell>Склад відправлення</TableCell>
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
                      name={`items.${idx}.warehouseId`}
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small" error={!!errors.items?.[idx]?.warehouseId}>
                          <InputLabel>Склад</InputLabel>
                          <Select
                            label="Склад"
                            value={field.value ?? ''}
                            onChange={(event) => {
                              field.onChange(event)
                              setValue(`items.${idx}.variantId`, '' as unknown as number)
                            }}
                          >
                            <MenuItem value="">
                              <em>Оберіть склад</em>
                            </MenuItem>
                            {warehouses.map((warehouse) => (
                              <MenuItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} · {warehouse.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`items.${idx}.variantId`}
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small" error={!!errors.items?.[idx]?.variantId}>
                          <InputLabel>SKU / варіант</InputLabel>
                          <Select
                            label="SKU / варіант"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            disabled={!Number(watchedItems?.[idx]?.warehouseId)}
                          >
                            {(stockByWarehouse.get(Number(watchedItems?.[idx]?.warehouseId)) ?? []).map((v) => (
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
          <Button
            startIcon={<Plus size={16} />}
            onClick={() => append({
              variantId: '' as unknown as number,
              warehouseId: '' as unknown as number,
              quantity: 1,
            })}
          >
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
