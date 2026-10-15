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
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
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
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<CatalogImportMode>(0)
  const [result, setResult] = useState<ImportBatch | null>(null)

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Оберіть файл')
      return importsApi.catalog(file, mode)
    },
    onSuccess: (batch) => {
      setResult(batch)
      enqueueSnackbar('Імпорт завершено', { variant: 'success' })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  return (
    <>
      <PageHeader title="Імпорт каталогу" description="Завантаження CSV/XLSX з товарами" />
      <Paper sx={{ p: 3, maxWidth: 560 }}>
        <Stack spacing={2}>
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
          <Button variant="outlined" component="label" startIcon={<Upload size={16} />}>
            {file ? file.name : 'Обрати файл'}
            <input
              type="file"
              hidden
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setResult(null)
              }}
            />
          </Button>
          <Button variant="contained" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Обробка…' : 'Завантажити'}
          </Button>
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
