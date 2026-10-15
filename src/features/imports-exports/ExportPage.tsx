import { useState } from 'react'
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage } from '@/api/client'
import { exportsApi } from '@/api/admin.api'
import { warehousesApi } from '@/api/inventory.api'

export function ExportPage() {
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [fromUtc, setFromUtc] = useState('')
  const [toUtc, setToUtc] = useState('')

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list() })

  const run = useMutation({
    mutationFn: async (kind: 'products' | 'inventory' | 'orders') => {
      if (kind === 'products') return exportsApi.products()
      if (kind === 'inventory') {
        return exportsApi.inventory(warehouseId ? Number(warehouseId) : undefined)
      }
      return exportsApi.orders(fromUtc || undefined, toUtc || undefined)
    },
    onSuccess: () => enqueueSnackbar('Файл завантажено', { variant: 'success' }),
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  return (
    <>
      <PageHeader title="Експорт даних" description="CSV-вивантаження для звітності та обміну" />
      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <Stack spacing={2}>
          <Button
            variant="contained"
            startIcon={<Download size={16} />}
            disabled={run.isPending}
            onClick={() => run.mutate('products')}
          >
            Товари
          </Button>
          <FormControl size="small" fullWidth>
            <InputLabel>Склад (необовʼязково)</InputLabel>
            <Select label="Склад (необовʼязково)" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <MenuItem value="">Усі склади</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={String(w.id)}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            disabled={run.isPending}
            onClick={() => run.mutate('inventory')}
          >
            Залишки
          </Button>
          <TextField
            size="small"
            label="Замовлення від (ISO UTC)"
            placeholder="2026-01-01T00:00:00.000Z"
            value={fromUtc}
            onChange={(e) => setFromUtc(e.target.value)}
          />
          <TextField
            size="small"
            label="Замовлення до (ISO UTC)"
            value={toUtc}
            onChange={(e) => setToUtc(e.target.value)}
          />
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            disabled={run.isPending}
            onClick={() => run.mutate('orders')}
          >
            Замовлення
          </Button>
        </Stack>
      </Paper>
    </>
  )
}
