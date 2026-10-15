import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
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
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { BoolChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { productsApi, type ProductVariantInput } from '@/api/catalog.api'

const fmt = (n: number) => `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

const variantSchema = z.object({
  sku: z.string().min(1, "Обов'язкове поле"),
  variantName: z.string().min(1, "Обов'язкове поле"),
  barcode: z.string().optional(),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  oldPrice: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
})
type VariantForm = z.infer<typeof variantSchema>

export function ProductDetailPage() {
  const { id } = useParams()
  const productId = Number(id)
  const qc = useQueryClient()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [variantOpen, setVariantOpen] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId),
    enabled: Number.isFinite(productId),
  })

  const form = useForm<VariantForm>({
    resolver: zodResolver(variantSchema),
    defaultValues: { sku: '', variantName: '', purchasePrice: 0, sellingPrice: 0 },
  })

  const deactivate = useMutation({
    mutationFn: () => productsApi.deactivate(productId),
    onSuccess: () => {
      enqueueSnackbar('Товар деактивовано', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['product', productId] })
      setConfirmDeactivate(false)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const addVariant = useMutation({
    mutationFn: (body: ProductVariantInput) => productsApi.addVariant(productId, body),
    onSuccess: () => {
      enqueueSnackbar('Варіант додано', { variant: 'success' })
      setVariantOpen(false)
      form.reset()
      void qc.invalidateQueries({ queryKey: ['product', productId] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return null

  const onAddVariant = form.handleSubmit((v) =>
    addVariant.mutate({
      sku: v.sku,
      variantName: v.variantName,
      barcode: v.barcode || null,
      purchasePrice: v.purchasePrice,
      sellingPrice: v.sellingPrice,
      oldPrice: v.oldPrice ?? null,
      weight: v.weight ?? null,
      isActive: true,
    }),
  )

  return (
    <>
      <PageHeader
        title={data.name}
        crumbs={[
          { label: 'Товари', to: '/catalog/products' },
          { label: data.name },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component={RouterLink} to={`/catalog/products/${productId}/edit`}>
              Редагувати
            </Button>
            {data.isActive && (
              <Button color="error" variant="outlined" onClick={() => setConfirmDeactivate(true)}>
                Деактивувати
              </Button>
            )}
          </Stack>
        }
      />
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack sx={{ flexDirection: { xs: 'column', md: 'row' } }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Категорія: {data.categoryName}</Typography>
            <Typography variant="body2" color="text.secondary">Бренд: {data.brandName ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">Slug: {data.slug}</Typography>
            {data.shortDescription && <Typography sx={{ mt: 1 }}>{data.shortDescription}</Typography>}
            {data.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {data.description}
              </Typography>
            )}
          </Box>
          <Box>
            <BoolChip value={data.isActive} />
            {data.warrantyMonths != null && (
              <Typography variant="body2" sx={{ mt: 1 }}>Гарантія: {data.warrantyMonths} міс.</Typography>
            )}
          </Box>
        </Stack>
      </Paper>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Варіанти</Typography>
        <Button variant="contained" size="small" onClick={() => setVariantOpen(true)} disabled={!data.isActive}>
          Додати варіант
        </Button>
      </Stack>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell align="right">Закупівля</TableCell>
              <TableCell align="right">Продаж</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.variants.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.sku}</TableCell>
                <TableCell>{v.variantName}</TableCell>
                <TableCell align="right">{fmt(v.purchasePrice)}</TableCell>
                <TableCell align="right">{fmt(v.sellingPrice)}</TableCell>
                <TableCell><BoolChip value={v.isActive} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Link component={RouterLink} to={`/inventory?variantId=${v.id}`}>
                      Залишки
                    </Link>
                    <Link component={RouterLink} to={`/inventory/movements?sku=${encodeURIComponent(v.sku)}`}>
                      Рухи
                    </Link>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <ConfirmDialog
        open={confirmDeactivate}
        title="Деактивувати товар?"
        message="Усі варіанти стануть недоступні для продажу."
        confirmLabel="Деактивувати"
        danger
        loading={deactivate.isPending}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => deactivate.mutate()}
      />
      <Dialog open={variantOpen} onClose={() => !addVariant.isPending && setVariantOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новий варіант</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }} component="form" id="variant-form" onSubmit={onAddVariant}>
            <TextField label="SKU" {...form.register('sku')} error={!!form.formState.errors.sku} helperText={form.formState.errors.sku?.message} />
            <TextField label="Назва варіанту" {...form.register('variantName')} error={!!form.formState.errors.variantName} helperText={form.formState.errors.variantName?.message} />
            <TextField label="Штрихкод" {...form.register('barcode')} />
            <Stack direction="row" spacing={2}>
              <TextField type="number" label="Закупівля" fullWidth {...form.register('purchasePrice', { valueAsNumber: true })} />
              <TextField type="number" label="Продаж" fullWidth {...form.register('sellingPrice', { valueAsNumber: true })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVariantOpen(false)}>Скасувати</Button>
          <Button type="submit" form="variant-form" variant="contained" disabled={addVariant.isPending}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
