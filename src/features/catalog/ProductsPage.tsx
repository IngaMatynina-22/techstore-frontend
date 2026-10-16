import { useMemo, useState } from 'react'
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Ban, CheckCircle, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { BoolChip } from '@/components/feedback/StatusChip'
import { IconAction } from '@/components/actions/IconAction'
import { useUrlState } from '@/hooks/useUrlState'
import { useTablePrefs } from '@/hooks/useTablePrefs'
import { getErrorMessage } from '@/api/client'
import { brandsApi, categoriesApi, productsApi, type ProductListItem } from '@/api/catalog.api'

const fmt = (n?: number | null) =>
  n == null ? '—' : `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

export function ProductsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { params, get, page, pageSize, setMany } = useUrlState()
  const { prefs, setPageSize: persistPageSize, toggleColumn } = useTablePrefs('products')
  const effectivePageSize = params.has('pageSize') ? pageSize : prefs.pageSize
  const search = get('search')
  const categoryId = get('categoryId')
  const brandId = get('brandId')
  const isActive = get('isActive')
  const sortBy = get('sortBy', 'createdAtDesc')
  const [draftSearch, setDraftSearch] = useState(search)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const listParams = useMemo(
    () => ({
      page,
      pageSize: effectivePageSize,
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      isActive: isActive === '' ? undefined : isActive === 'true',
      sortBy: sortBy || undefined,
    }),
    [page, effectivePageSize, search, categoryId, brandId, isActive, sortBy],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', listParams],
    queryFn: () => productsApi.list(listParams),
  })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() })

  const deactivate = useMutation({
    mutationFn: (id: number) => productsApi.deactivate(id),
    onSuccess: () => {
      enqueueSnackbar('Товар деактивовано', { variant: 'success' })
      setDeactivateId(null)
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const activate = useMutation({
    mutationFn: (id: number) => productsApi.activate(id),
    onSuccess: () => {
      enqueueSnackbar('Товар активовано', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<ProductListItem>[] = [
    { id: 'name', label: 'Назва', render: (r) => <Link component={RouterLink} to={`/catalog/products/${r.id}`}>{r.name}</Link> },
    { id: 'cat', label: 'Категорія', render: (r) => r.categoryName },
    { id: 'brand', label: 'Бренд', render: (r) => r.brandName ?? '—' },
    { id: 'sku', label: 'SKU', render: (r) => r.primarySku ?? '—' },
    {
      id: 'price',
      label: 'Ціна',
      align: 'right',
      render: (r) =>
        r.minSellingPrice != null
          ? r.minSellingPrice === r.maxSellingPrice
            ? fmt(r.minSellingPrice)
            : `${fmt(r.minSellingPrice)} – ${fmt(r.maxSellingPrice)}`
          : '—',
    },
    { id: 'variants', label: 'Варіанти', align: 'center', render: (r) => r.variantsCount },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
    {
      id: 'actions',
      label: '',
      width: 56,
      render: (r) =>
        r.isActive ? (
          <IconAction title="Деактивувати" color="error" onClick={() => setDeactivateId(r.id)}>
            <Ban size={16} />
          </IconAction>
        ) : (
          <IconAction
            title="Активувати"
            color="success"
            disabled={activate.isPending}
            onClick={() => activate.mutate(r.id)}
          >
            <CheckCircle size={16} />
          </IconAction>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Товари"
        description="Каталог товарів та варіантів"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} component={RouterLink} to="/catalog/products/new">
            Новий товар
          </Button>
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="Пошук"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setMany({ search: draftSearch, page: 1 })}
          sx={{ minWidth: 180, flex: '1 1 160px' }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Категорія</InputLabel>
          <Select label="Категорія" value={categoryId} onChange={(e) => setMany({ categoryId: e.target.value, page: 1 })}>
            <MenuItem value="">Усі</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Бренд</InputLabel>
          <Select label="Бренд" value={brandId} onChange={(e) => setMany({ brandId: e.target.value, page: 1 })}>
            <MenuItem value="">Усі</MenuItem>
            {brands.map((b) => (
              <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Статус</InputLabel>
          <Select label="Статус" value={isActive} onChange={(e) => setMany({ isActive: e.target.value, page: 1 })}>
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="true">Активні</MenuItem>
            <MenuItem value="false">Неактивні</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Сортування</InputLabel>
          <Select label="Сортування" value={sortBy} onChange={(e) => setMany({ sortBy: e.target.value, page: 1 })}>
            <MenuItem value="createdAtDesc">Нові спочатку</MenuItem>
            <MenuItem value="nameAsc">Назва А–Я</MenuItem>
            <MenuItem value="nameDesc">Назва Я–А</MenuItem>
            <MenuItem value="priceAsc">Ціна ↑</MenuItem>
            <MenuItem value="priceDesc">Ціна ↓</MenuItem>
          </Select>
        </FormControl>
        <IconButton color="primary" aria-label="Знайти" onClick={() => setMany({ search: draftSearch, page: 1 })}>
          <Search size={18} />
        </IconButton>
      </Stack>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Товарів не знайдено"
        page={page}
        pageSize={effectivePageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => {
          persistPageSize(s)
          setMany({ pageSize: s, page: 1 })
        }}
        onRowClick={(r) => navigate(`/catalog/products/${r.id}`)}
        hiddenColumnIds={prefs.hiddenColumns}
        onToggleColumn={toggleColumn}
      />
      <ConfirmDialog
        open={deactivateId != null}
        title="Деактивувати товар?"
        message="Товар стане неактивним для продажу."
        confirmLabel="Деактивувати"
        danger
        loading={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId != null && deactivate.mutate(deactivateId)}
      />
    </>
  )
}
