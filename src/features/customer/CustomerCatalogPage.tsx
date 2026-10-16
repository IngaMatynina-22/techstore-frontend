import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage } from '@/api/client'
import { categoriesApi, productsApi } from '@/api/catalog.api'
import { useUrlState } from '@/hooks/useUrlState'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

export function CustomerCatalogPage() {
  const { get, page, pageSize, setMany } = useUrlState()
  const search = get('search')
  const categoryId = get('categoryId')
  const [draft, setDraft] = useState(search)

  const listParams = useMemo(
    () => ({
      page,
      pageSize: pageSize || 12,
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      isActive: true,
    }),
    [page, pageSize, search, categoryId],
  )

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => categoriesApi.list(false),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-products', listParams],
    queryFn: () => productsApi.list(listParams),
  })

  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / (listParams.pageSize as number)))

  return (
    <>
      <PageHeader title="Каталог" description="Оберіть товари для замовлення" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <TextField
          size="small"
          label="Пошук"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setMany({ search: draft || undefined, page: 1 })
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Категорія</InputLabel>
          <Select
            label="Категорія"
            value={categoryId}
            onChange={(e) => setMany({ categoryId: e.target.value || undefined, page: 1 })}
          >
            <MenuItem value="">Усі</MenuItem>
            {categories
              .filter((c) => c.isActive)
              .map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => setMany({ search: draft || undefined, page: 1 })}>
          Знайти
        </Button>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {getErrorMessage(error)}
        </Typography>
      )}
      {isLoading && <Typography variant="body2">Завантаження…</Typography>}

      <Grid container spacing={2}>
        {(data?.items ?? []).map((p) => (
          <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
                  {p.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.categoryName}
                  {p.brandName ? ` · ${p.brandName}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {p.minSellingPrice != null
                    ? p.minSellingPrice === p.maxSellingPrice
                      ? fmt(p.minSellingPrice)
                      : `${fmt(p.minSellingPrice)} – ${fmt(p.maxSellingPrice ?? p.minSellingPrice)}`
                    : 'Ціна за запитом'}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" component={RouterLink} to={`/app/catalog/${p.id}`}>
                  Деталі
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!isLoading && (data?.items?.length ?? 0) === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Товарів не знайдено
        </Typography>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 3, justifyContent: 'center' }}>
          <Button disabled={page <= 1} onClick={() => setMany({ page: page - 1 })}>
            Назад
          </Button>
          <Typography variant="body2" sx={{ alignSelf: 'center' }}>
            {page} / {totalPages}
          </Typography>
          <Button disabled={page >= totalPages} onClick={() => setMany({ page: page + 1 })}>
            Далі
          </Button>
        </Box>
      )}
    </>
  )
}
