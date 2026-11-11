import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { StatusChip } from '@/components/feedback/StatusChip'
import { getErrorMessage } from '@/api/client'
import { importsApi, type ImportBatch } from '@/api/admin.api'
import type { CatalogImportMode } from '@/types/api'
import { fmtDateTime, fmtNum } from '@/features/reports/reportUtils'

const MODES: { value: CatalogImportMode; label: string }[] = [
  { value: 0, label: 'Лише перевірка (ValidateOnly)' },
  { value: 1, label: 'Створити (Create)' },
  { value: 2, label: 'Оновити за SKU (UpdateBySku)' },
  { value: 3, label: 'Upsert за SKU (UpsertBySku)' },
]

export function ImportPage() {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<CatalogImportMode>(0)
  const [result, setResult] = useState<ImportBatch | null>(null)
  const [importType, setImportType] = useState<'catalog' | 'inventory'>('catalog')

  const upload = useMutation({
    mutationFn: (type: 'catalog' | 'inventory') => {
      if (!file) throw new Error('Оберіть файл')
      return type === 'catalog' ? importsApi.catalog(file, mode) : importsApi.inventory(file)
    },
    onSuccess: (batch, type) => {
      setResult(batch)
      const queryKeys =
        type === 'inventory'
          ? [
              ['inventory'],
              ['stock-movements'],
              ['reports', 'inventory'],
              ['products'],
              ['product'],
              ['customer-products'],
              ['customer-product'],
            ]
          : [['products'], ['product'], ['categories'], ['brands'], ['customer-products'], ['customer-product'], ['customer-categories']]
      queryKeys.forEach((queryKey) => void qc.invalidateQueries({ queryKey }))
      enqueueSnackbar(
        batch.failedRows > 0 ? 'Імпорт завершено з помилками в окремих рядках' : 'Імпорт завершено',
        { variant: batch.failedRows > 0 ? 'warning' : 'success' },
      )
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const downloadInventoryTemplate = () => {
    const headers = 'Sku,WarehouseCode,QuantityOnHand,ProductName,VariantName,CategorySlug,BrandName,PurchasePrice,SellingPrice,Barcode,IsActive'
    const blob = new Blob([`\uFEFF${headers}\r\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'supplier-inventory-template.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <>
      <PageHeader
        title={importType === 'catalog' ? 'Імпорт каталогу' : 'Імпорт залишків постачальника'}
        description={importType === 'catalog' ? 'Завантаження CSV з товарами' : 'Оновлення залишків і даних товарів із CSV'}
      />
      <Paper sx={{ p: 3, maxWidth: 560 }}>
        <Stack spacing={2}>
          <Tabs
            value={importType}
            onChange={(_, value) => {
              setImportType(value)
              setFile(null)
              setResult(null)
            }}
            variant="fullWidth"
          >
            <Tab value="catalog" label="Каталог" disabled={upload.isPending} />
            <Tab value="inventory" label="Залишки постачальника" disabled={upload.isPending} />
          </Tabs>
          {importType === 'catalog' ? (
            <FormControl fullWidth size="small">
              <InputLabel>Режим</InputLabel>
              <Select label="Режим" value={mode} onChange={(e) => setMode(Number(e.target.value) as CatalogImportMode)}>
                {MODES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Stack spacing={1}>
              <Typography variant="body2">
                Обовʼязкові колонки: <strong>Sku, WarehouseCode, QuantityOnHand</strong>. SKU має відповідати
                наявному товару, а WarehouseCode — коду активного складу.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                За наявності можна також передати ProductName, VariantName, CategorySlug, BrandName,
                PurchasePrice, SellingPrice, Barcode, IsActive. Порожні значення не змінюють каталог;
                кількість у файлі встановлюється як фактичний залишок і не може бути меншою за резерв.
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
                Sku,WarehouseCode,QuantityOnHand,ProductName,VariantName,CategorySlug,BrandName,PurchasePrice,SellingPrice,Barcode,IsActive
              </Typography>
              <Button size="small" variant="text" onClick={downloadInventoryTemplate} sx={{ alignSelf: 'flex-start' }}>
                Завантажити шаблон CSV
              </Button>
            </Stack>
          )}
          <Button variant="outlined" component="label" startIcon={<Upload size={16} />}>
            {file ? file.name : 'Обрати файл'}
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setResult(null)
              }}
            />
          </Button>
          <Button
            variant="contained"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate(importType)}
          >
            {upload.isPending ? 'Обробка…' : 'Завантажити'}
          </Button>
          {importType === 'inventory' && (
            <Typography variant="caption" color="text.secondary">
              CSV, до 2 МБ та 5 000 рядків. Імпорт створює рух коригування для кожної зміненої позиції.
            </Typography>
          )}
        </Stack>
      </Paper>

      {result && (
        <Box sx={{ mt: 3 }}>
          <Alert severity={result.failedRows > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
            Пакет #{result.id}: успішно {fmtNum(result.successfulRows)} / {fmtNum(result.totalRows)}, помилок{' '}
            {fmtNum(result.failedRows)}
          </Alert>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2">
                <strong>Файл:</strong> {result.fileName}
              </Typography>
              <StatusChip label={result.status} status={result.status} />
              <Typography variant="body2" color="text.secondary">
                {fmtDateTime(result.createdAt)}
              </Typography>
              <Link component={RouterLink} to={`/data/import/${result.id}`}>
                Деталі пакету →
              </Link>
            </Stack>
          </Paper>
        </Box>
      )}
    </>
  )
}
