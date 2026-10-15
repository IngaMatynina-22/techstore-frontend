import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import { Pencil } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { getErrorMessage } from '@/api/client'
import { settingsApi, type SettingDto } from '@/api/admin.api'
import { useAuth } from '@/features/auth/AuthContext'
import { fmtDateTime } from '@/features/reports/reportUtils'

export function SettingsPage() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<SettingDto | null>(null)
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.list(),
  })

  const save = useMutation({
    mutationFn: () =>
      settingsApi.upsert(edit!.key, { value: value || null, description: description || null }),
    onSuccess: () => {
      enqueueSnackbar('Збережено', { variant: 'success' })
      setEdit(null)
      void qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<SettingDto>[] = [
    { id: 'key', label: 'Ключ', render: (r) => r.key },
    { id: 'value', label: 'Значення', render: (r) => r.value ?? '—' },
    { id: 'desc', label: 'Опис', render: (r) => r.description ?? '—' },
    { id: 'at', label: 'Оновлено', render: (r) => fmtDateTime(r.updatedAt) },
    {
      id: 'act',
      label: '',
      width: 56,
      render: (r) =>
        isAdmin ? (
          <Tooltip title="Редагувати">
            <IconButton
              size="small"
              onClick={() => {
                setEdit(r)
                setValue(r.value ?? '')
                setDescription(r.description ?? '')
              }}
            >
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title="Налаштування"
        description={isAdmin ? 'Редагування доступне адміністратору' : 'Лише перегляд'}
      />
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.key}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Налаштувань немає"
        page={1}
        pageSize={Math.max(data.length, 1)}
        totalCount={data.length}
        onPageChange={() => {}}
      />
      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>{edit?.key}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Значення" fullWidth multiline minRows={2} value={value} onChange={(e) => setValue(e.target.value)} />
            <TextField label="Опис" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Скасувати</Button>
          <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
