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
} from '@mui/material'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage } from '@/api/client'
import { purchaseOrdersApi, suppliersApi } from '@/api/purchasing.api'
import { warehousesApi } from '@/api/inventory.api'
import type { PagedResult } from '@/types/api'
import type { Supplier as SupplierType } from '@/api/purchasing.api'

const schema = z.object({
  supplierId: z.coerce.number().positive(),
  warehouseId: z.coerce.number().positive(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        variantId: z.coerce.number().positive(),
        orderedQuantity: z.coerce.number().int().min(1),
        unitCost: z.coerce.number().min(0),
      }),
    )
    .min(1),
})

type FormValues = z.infer<typeof schema>

function normalizeSuppliers(data: PagedResult<SupplierType> | SupplierType[] | undefined) {
  if (!data) return []
  return Array.isArray(data) ? data : data.items
}

export function PurchaseOrderCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const presetSupplier = (location.state as { supplierId?: number } | null)?.supplierId

  const { control, register, handleSubmit, watch, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      supplierId: presetSupplier ?? ('' as unknown as number),
      warehouseId: '' as unknown as number,
      notes: '',
      items: [{ variantId: '' as unknown as number, orderedQuantity: 1, unitCost: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const supplierId = watch('supplierId')

  const { data: suppliersRaw } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => suppliersApi.list({ pageSize: 200 }) })
  const suppliers = useMemo(() => normalizeSuppliers(suppliersRaw), [suppliersRaw])
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const { data: supplierProducts = [] } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => suppliersApi.products(Number(supplierId)),
    enabled: Number(supplierId) > 0,
  })

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      purchaseOrdersApi.create({
        supplierId: v.supplierId,
        warehouseId: v.warehouseId,
        notes: v.notes || undefined,
        items: v.items.map((i) => ({
          variantId: i.variantId,
          orderedQuantity: i.orderedQuantity,
          unitCost: i.unitCost,
        })),
      }),
    onSuccess: (po) => {
      enqueueSnackbar('Закупівлю створено', { variant: 'success' })
      navigate(`/purchasing/purchase-orders/${po.id}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  return (
    <>
      <PageHeader
        title="Нова закупівля"
        crumbs={[
          { label: 'Закупівлі', to: '/purchasing/purchase-orders' },
          { label: 'Створення' },
        ]}
      />
      <Paper sx={{ p: 3, maxWidth: 960 }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit((v) => create.mutate(v))}>
          <Stack sx={{ flexDirection: { xs: 'column', sm: 'row' } }} spacing={2}>
            <Controller
              name="supplierId"
              control={control}
              render={({ field }) => (
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Постачальник</InputLabel>
                  <Select label="Постачальник" value={field.value ?? ''} onChange={field.onChange}>
                    {suppliers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="warehouseId"
              control={control}
              render={({ field }) => (
                <FormControl size="small" sx={{ minWidth: 200 }}>
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
            <TextField size="small" label="Примітки" fullWidth {...register('notes')} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Варіант</TableCell>
                <TableCell width={100}>К-сть</TableCell>
                <TableCell width={120}>Ціна</TableCell>
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
                          <InputLabel>Позиція</InputLabel>
                          <Select label="Позиція" value={field.value ?? ''} onChange={field.onChange} disabled={!supplierId}>
                            {supplierProducts.map((p) => (
                              <MenuItem key={p.variantId} value={p.variantId}>
                                {p.sku} · {p.productName} ({p.supplyPrice} ₴)
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" {...register(`items.${idx}.orderedQuantity`)} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" slotProps={{ htmlInput: { step: 0.01 } }} {...register(`items.${idx}.unitCost`)} />
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
            onClick={() => append({ variantId: '' as unknown as number, orderedQuantity: 1, unitCost: 0 })}
          >
            Позиція
          </Button>
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={isSubmitting || create.isPending}>
              Створити
            </Button>
            <Button onClick={() => navigate('/purchasing/purchase-orders')}>Скасувати</Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  )
}
