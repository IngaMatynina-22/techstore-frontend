import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { ArrowLeftRight, Package, Search, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { IconAction } from '@/components/actions/IconAction'
import { useUrlState } from '@/hooks/useUrlState'
import { useTablePrefs } from '@/hooks/useTablePrefs'
import { getErrorMessage } from '@/api/client'
import { brandsApi, categoriesApi } from '@/api/catalog.api'
import { inventoryApi, warehousesApi, type InventoryItem } from '@/api/inventory.api'

type InventoryMode = 'all' | 'lowStock' | 'outOfStock'

function resolveMode(pathname: string): InventoryMode {
  if (pathname.endsWith('/low-stock')) return 'lowStock'
  if (pathname.endsWith('/out-of-stock')) return 'outOfStock'
  return 'all'
}

const titles: Record<InventoryMode, { title: string; description: string }> = {
  all: { title: 'Залишки', description: 'Залишки товарів на складах' },
  lowStock: { title: 'Низький залишок', description: 'Позиції нижче порогу поповнення' },
  outOfStock: { title: 'Немає в наявності', description: 'Позиції з нульовим доступним залишком' },
}

export function InventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const mode = resolveMode(location.pathname)
  const { params, get, getBool, page, pageSize, setMany } = useUrlState()
  const { prefs, setPageSize: persistPageSize, toggleColumn } = useTablePrefs('inventory')
  const effectivePageSize = params.has('pageSize') ? pageSize : prefs.pageSize
  const qc = useQueryClient()

  const warehouseId = get('warehouseId')
  const sku = get('sku')
  const productName = get('productName')
  const categoryId = get('categoryId')
  const brandId = get('brandId')
  const lowStockOnly = getBool('lowStockOnly') || mode === 'lowStock'
  const outOfStockOnly = getBool('outOfStockOnly') || mode === 'outOfStock'

  const [draftSku, setDraftSku] = useState(sku)
  const [draftProductName, setDraftProductName] = useState(productName)
  const [thresholdRow, setThresholdRow] = useState<InventoryItem | null>(null)
  const [thresholdValue, setThresholdValue] = useState('')

  const listParams = useMemo(
    () => ({
      page,
      pageSize: effectivePageSize,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      sku: sku || undefined,
      productName: productName || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      lowStockOnly: mode === 'all' && lowStockOnly ? true : undefined,
      outOfStockOnly: mode === 'all' && outOfStockOnly ? true : undefined,
    }),
    [page, effectivePageSize, warehouseId, sku, productName, categoryId, brandId, lowStockOnly, outOfStockOnly, mode],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', mode, listParams],
    queryFn: () => {
      if (mode === 'lowStock') return inventoryApi.lowStock(listParams)
      if (mode === 'outOfStock') return inventoryApi.outOfStock(listParams)
      return inventoryApi.list(listParams)
    },
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() })

  const setThreshold = useMutation({
    mutationFn: ({ variantId, lowStockThreshold }: { variantId: number; lowStockThreshold: number | null }) =>
      inventoryApi.setThreshold(variantId, lowStockThreshold),
    onSuccess: () => {
      enqueueSnackbar('Поріг збережено', { variant: 'success' })
      setThresholdRow(null)
      void qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const openThreshold = (row: InventoryItem) => {
    setThresholdRow(row)
    setThresholdValue(row.lowStockThreshold != null ? String(row.lowStockThreshold) : '')
  }

  const columns: Column<InventoryItem>[] = [
    {
      id: 'warehouse',
      label: 'Склад',
      render: (r) => (
        <Link component={RouterLink} to={`/inventory/warehouses/${r.warehouseId}`}>
          {r.warehouseName}
        </Link>
      ),
    },
    { id: 'sku', label: 'SKU', render: (r) => r.sku },
    {
      id: 'product',
      label: 'Товар',
      render: (r) => (
        <Link component={RouterLink} to={`/catalog/products/${r.productId}`}>
          {r.productName}
        </Link>
      ),
    },
    { id: 'variant', label: 'Варіант', render: (r) => r.variantName },
    { id: 'category', label: 'Категорія', render: (r) => r.categoryName },
    { id: 'brand', label: 'Бренд', render: (r) => r.brandName ?? '—' },
    { id: 'onHand', label: 'На складі', align: 'right', render: (r) => r.quantityOnHand },
    { id: 'reserved', label: 'Резерв', align: 'right', render: (r) => r.quantityReserved },
    { id: 'available', label: 'Доступно', align: 'right', render: (r) => r.availableQuantity },
    {
      id: 'threshold',
      label: 'Поріг',
      align: 'right',
      render: (r) => (r.lowStockThreshold != null ? r.lowStockThreshold : '—'),
    },
    {
      id: 'status',
      label: 'Статус',
      render: (r) => {
        if (r.availableQuantity <= 0) return <StatusChip label="Немає" status="out" />
        if (r.isBelowThreshold) return <StatusChip label="Низький" status="low" />
        return <StatusChip label="OK" status="ok" />
      },
    },
    {
      id: 'actions',
      label: '',
      width: 120,
      render: (r) => (
        <Stack direction="row" spacing={0.25}>
          <IconAction title="Поріг" onClick={() => openThreshold(r)}>
            <SlidersHorizontal size={16} />
          </IconAction>
          <IconAction title="Товар" component={RouterLink} to={`/catalog/products/${r.productId}`}>
            <Package size={16} />
          </IconAction>
          <IconAction
            title="Рухи"
            component={RouterLink}
            to={`/inventory/movements?warehouseId=${r.warehouseId}&sku=${encodeURIComponent(r.sku)}`}
          >
            <ArrowLeftRight size={16} />
          </IconAction>
        </Stack>
      ),
    },
  ]

  const { title, description } = titles[mode]

  const applyFilters = () =>
    setMany({
      sku: draftSku,
      productName: draftProductName,
      page: 1,
    })

  return (
    <>
      <PageHeader title={title} description={description} />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Склад</InputLabel>
          <Select
            label="Склад"
            value={warehouseId}
            onChange={(e) => setMany({ warehouseId: e.target.value, page: 1 })}
          >
            <MenuItem value="">Усі</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="SKU"
          value={draftSku}
          onChange={(e) => setDraftSku(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          sx={{ minWidth: 120, flex: '1 1 100px' }}
        />
        <TextField
          size="small"
          label="Назва товару"
          value={draftProductName}
          onChange={(e) => setDraftProductName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          sx={{ minWidth: 150, flex: '1 1 140px' }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Категорія</InputLabel>
          <Select label="Категорія" value={categoryId} onChange={(e) => setMany({ categoryId: e.target.value, page: 1 })}>
            <MenuItem value="">Усі</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Бренд</InputLabel>
          <Select label="Бренд" value={brandId} onChange={(e) => setMany({ brandId: e.target.value, page: 1 })}>
            <MenuItem value="">Усі</MenuItem>
            {brands.map((b) => (
              <MenuItem key={b.id} value={String(b.id)}>
                {b.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {mode === 'all' && (
          <>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Низький залишок</InputLabel>
              <Select
                label="Низький залишок"
                value={getBool('lowStockOnly') ? 'true' : ''}
                onChange={(e) => setMany({ lowStockOnly: e.target.value === 'true' ? true : null, page: 1 })}
              >
                <MenuItem value="">Усі</MenuItem>
                <MenuItem value="true">Лише низький</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Немає в наявності</InputLabel>
              <Select
                label="Немає в наявності"
                value={getBool('outOfStockOnly') ? 'true' : ''}
                onChange={(e) => setMany({ outOfStockOnly: e.target.value === 'true' ? true : null, page: 1 })}
              >
                <MenuItem value="">Усі</MenuItem>
                <MenuItem value="true">Лише відсутні</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
        <IconButton color="primary" aria-label="Знайти" onClick={applyFilters}>
          <Search size={18} />
        </IconButton>
      </Stack>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => `${r.warehouseId}-${r.variantId}`}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Записів не знайдено"
        page={page}
        pageSize={effectivePageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => {
          persistPageSize(s)
          setMany({ pageSize: s, page: 1 })
        }}
        onRowClick={(r) =>
          navigate(`/inventory/movements?warehouseId=${r.warehouseId}&sku=${encodeURIComponent(r.sku)}`)
        }
        hiddenColumnIds={prefs.hiddenColumns}
        onToggleColumn={toggleColumn}
      />
      <Dialog open={thresholdRow != null} onClose={() => setThresholdRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Поріг низького залишку</DialogTitle>
        <DialogContent>
          {thresholdRow && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField size="small" label="SKU" value={thresholdRow.sku} disabled fullWidth />
              <TextField
                size="small"
                label="Поріг (порожньо — без порогу)"
                type="number"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThresholdRow(null)} disabled={setThreshold.isPending}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            disabled={setThreshold.isPending || !thresholdRow}
            onClick={() => {
              if (!thresholdRow) return
              const trimmed = thresholdValue.trim()
              const lowStockThreshold = trimmed === '' ? null : Number(trimmed)
              if (trimmed !== '' && (!Number.isFinite(lowStockThreshold) || lowStockThreshold! < 0)) {
                enqueueSnackbar('Введіть коректне число', { variant: 'warning' })
                return
              }
              setThreshold.mutate({ variantId: thresholdRow.variantId, lowStockThreshold })
            }}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
