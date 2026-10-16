import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
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
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { BoolChip } from '@/components/feedback/StatusChip'
import { IconAction } from '@/components/actions/IconAction'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { suppliersApi, type SupplierProduct } from '@/api/purchasing.api'
import { productsApi } from '@/api/catalog.api'

type Row = {
  variantId: number
  supplierSku: string
  supplyPrice: number
  deliveryDays: string
  isPreferred: boolean
}

export function SupplierDetailPage() {
  const { id } = useParams()
  const supplierId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [rows, setRows] = useState<Row[]>([])

  const { data: supplier, isLoading, error, refetch } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersApi.get(supplierId),
    enabled: Number.isFinite(supplierId),
  })
  const { data: links = [] } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => suppliersApi.products(supplierId),
    enabled: Number.isFinite(supplierId),
  })
  const { data: productsPage } = useQuery({
    queryKey: ['products-variants'],
    queryFn: () => productsApi.list({ page: 1, pageSize: 100, isActive: true }),
  })
  const { data: variantOptions = [] } = useQuery({
    queryKey: ['products-all-variants', productsPage?.items?.map((p) => p.id)],
    queryFn: async () => {
      const ids = productsPage?.items?.slice(0, 30).map((p) => p.id) ?? []
      const details = await Promise.all(ids.map((pid) => productsApi.get(pid)))
      return details.flatMap((d) =>
        d.variants.filter((v) => v.isActive).map((v) => ({
          id: v.id,
          label: `${v.sku} · ${d.name} / ${v.variantName}`,
        })),
      )
    },
    enabled: (productsPage?.items?.length ?? 0) > 0,
  })

  useEffect(() => {
    setRows(
      links.map((l: SupplierProduct) => ({
        variantId: l.variantId,
        supplierSku: l.supplierSku ?? '',
        supplyPrice: l.supplyPrice,
        deliveryDays: l.deliveryDays != null ? String(l.deliveryDays) : '',
        isPreferred: l.isPreferred,
      })),
    )
  }, [links])

  const saveProducts = useMutation({
    mutationFn: () =>
      suppliersApi.setProducts(
        supplierId,
        rows
          .filter((r) => r.variantId > 0)
          .map((r) => ({
            variantId: r.variantId,
            supplierSku: r.supplierSku || null,
            supplyPrice: r.supplyPrice,
            deliveryDays: r.deliveryDays ? Number(r.deliveryDays) : null,
            isPreferred: r.isPreferred,
          })),
      ),
    onSuccess: () => {
      enqueueSnackbar('Позиції постачальника збережено', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['supplier-products', supplierId] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!Number.isFinite(supplierId)) return null
  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !supplier) return null

  return (
    <>
      <PageHeader
        title={supplier.name}
        crumbs={[
          { label: 'Постачальники', to: '/purchasing/suppliers' },
          { label: supplier.name },
        ]}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconAction title="Редагувати" component={RouterLink} to={`/purchasing/suppliers/${supplierId}/edit`}>
              <Pencil size={18} />
            </IconAction>
            <Button variant="contained" onClick={() => navigate('/purchasing/purchase-orders/new', { state: { supplierId } })}>
              Закупівля
            </Button>
          </Stack>
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {supplier.email ?? '—'} · {supplier.phone ?? '—'} · <BoolChip value={supplier.isActive} />
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Товари постачальника
      </Typography>
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Варіант</TableCell>
            <TableCell>SKU постач.</TableCell>
            <TableCell>Ціна закупівлі</TableCell>
            <TableCell>Днів</TableCell>
            <TableCell>Основний</TableCell>
            <TableCell width={48} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <FormControl fullWidth size="small">
                  <InputLabel>Варіант</InputLabel>
                  <Select
                    label="Варіант"
                    value={r.variantId || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, variantId: v } : row)))
                    }}
                  >
                    {variantOptions.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={r.supplierSku}
                  onChange={(e) =>
                    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, supplierSku: e.target.value } : row)))
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  type="number"
                  value={r.supplyPrice}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, supplyPrice: Number(e.target.value) } : row)),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  type="number"
                  value={r.deliveryDays}
                  onChange={(e) =>
                    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, deliveryDays: e.target.value } : row)))
                  }
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={r.isPreferred}
                  onChange={(e) =>
                    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, isPreferred: e.target.checked } : row)))
                  }
                />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 size={16} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Stack direction="row" spacing={1}>
        <Button
          startIcon={<Plus size={16} />}
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { variantId: 0, supplierSku: '', supplyPrice: 0, deliveryDays: '', isPreferred: false },
            ])
          }
        >
          Додати
        </Button>
        <Button variant="contained" onClick={() => saveProducts.mutate()} disabled={saveProducts.isPending}>
          Зберегти список
        </Button>
      </Stack>
    </>
  )
}
