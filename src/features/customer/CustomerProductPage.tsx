import { useState } from 'react'
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/feedback/PageHeader'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { productsApi } from '@/api/catalog.api'
import { useCart } from '@/features/customer/cart'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

export function CustomerProductPage() {
  const { id } = useParams()
  const productId = Number(id)
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [variantId, setVariantId] = useState<number | ''>('')

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-product', productId],
    queryFn: () => productsApi.get(productId),
    enabled: Number.isFinite(productId),
  })

  if (!Number.isFinite(productId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !product) return null

  const variants = product.variants.filter((v) => v.isActive)
  const selected = variants.find((v) => v.id === variantId) ?? variants[0]

  const onAdd = () => {
    if (!selected) {
      enqueueSnackbar('Немає доступних варіантів', { variant: 'warning' })
      return
    }
    addItem({
      productId: product.id,
      productName: product.name,
      variantId: selected.id,
      variantName: selected.variantName,
      sku: selected.sku,
      unitPrice: selected.sellingPrice,
    })
    enqueueSnackbar('Додано до кошика', { variant: 'success' })
  }

  return (
    <>
      <PageHeader
        title={product.name}
        crumbs={[{ label: 'Каталог', to: '/app/catalog' }, { label: product.name }]}
      />
      <Paper sx={{ p: 3, maxWidth: 640 }}>
        <Stack spacing={2}>
          {product.shortDescription && (
            <Typography color="text.secondary">{product.shortDescription}</Typography>
          )}
          {product.description && <Typography variant="body2">{product.description}</Typography>}
          <Typography variant="body2">
            {product.categoryName}
            {product.brandName ? ` · ${product.brandName}` : ''}
          </Typography>

          {variants.length > 1 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Варіант</InputLabel>
              <Select
                label="Варіант"
                value={selected?.id ?? ''}
                onChange={(e) => setVariantId(Number(e.target.value))}
              >
                {variants.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.variantName} · {fmt(v.sellingPrice)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selected && (
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {fmt(selected.sellingPrice)}
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onAdd} disabled={!selected}>
              У кошик
            </Button>
            <Button variant="outlined" onClick={() => navigate('/app/cart')}>
              Перейти до кошика
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  )
}
