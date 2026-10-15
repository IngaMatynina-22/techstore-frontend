import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { BoolChip } from '@/components/feedback/StatusChip'
import { getErrorMessage } from '@/api/client'
import { warehousesApi, type Warehouse } from '@/api/inventory.api'

const schema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  code: z.string().min(1, "Обов'язкове поле"),
  address: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function WarehousesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRow, setEditRow] = useState<Warehouse | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', address: '' },
  })

  const openCreate = () => {
    setEditRow(null)
    form.reset({ name: '', code: '', address: '' })
    setDialogOpen(true)
  }

  const openEdit = (row: Warehouse) => {
    setEditRow(row)
    form.reset({ name: row.name, code: row.code, address: row.address ?? '' })
    setDialogOpen(true)
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const body = { name: values.name, code: values.code, address: values.address || null }
      if (editRow) return warehousesApi.update(editRow.id, body)
      return warehousesApi.create(body)
    },
    onSuccess: () => {
      enqueueSnackbar(editRow ? 'Склад оновлено' : 'Склад створено', { variant: 'success' })
      setDialogOpen(false)
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => warehousesApi.update(id, { isActive: false }),
    onSuccess: () => {
      enqueueSnackbar('Склад деактивовано', { variant: 'success' })
      setDeactivateId(null)
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => warehousesApi.remove(id),
    onSuccess: () => {
      enqueueSnackbar('Склад видалено', { variant: 'success' })
      setDeleteId(null)
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<Warehouse>[] = [
    {
      id: 'name',
      label: 'Назва',
      render: (r) => (
        <Link component={RouterLink} to={`/inventory/warehouses/${r.id}`}>
          {r.name}
        </Link>
      ),
    },
    { id: 'code', label: 'Код', render: (r) => r.code },
    { id: 'address', label: 'Адреса', render: (r) => r.address ?? '—' },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
    {
      id: 'actions',
      label: '',
      width: 220,
      render: (r) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => openEdit(r)}>
            Редагувати
          </Button>
          {r.isActive && (
            <Button size="small" color="warning" onClick={() => setDeactivateId(r.id)}>
              Деактивувати
            </Button>
          )}
          <Button size="small" color="error" onClick={() => setDeleteId(r.id)}>
            Видалити
          </Button>
        </Stack>
      ),
    },
  ]

  const onSubmit = form.handleSubmit((v) => save.mutate(v))

  return (
    <>
      <PageHeader
        title="Склади"
        description="Довідник складів та локацій"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>
            Новий склад
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Складів ще немає"
        page={1}
        pageSize={Math.max(data.length, 1)}
        totalCount={data.length}
        onPageChange={() => {}}
        onRowClick={(r) => navigate(`/inventory/warehouses/${r.id}`)}
      />
      <Dialog open={dialogOpen} onClose={() => !save.isPending && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRow ? 'Редагування складу' : 'Новий склад'}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} sx={{ pt: 1 }} onSubmit={onSubmit}>
            <TextField
              label="Назва"
              fullWidth
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <TextField
              label="Код"
              fullWidth
              error={!!form.formState.errors.code}
              helperText={form.formState.errors.code?.message}
              {...form.register('code')}
            />
            <TextField label="Адреса" fullWidth multiline minRows={2} {...form.register('address')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={save.isPending}>
            Скасувати
          </Button>
          <Button variant="contained" onClick={onSubmit} disabled={save.isPending}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={deactivateId != null}
        title="Деактивувати склад?"
        message="Склад стане неактивним для нових операцій."
        confirmLabel="Деактивувати"
        danger
        loading={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId != null && deactivate.mutate(deactivateId)}
      />
      <ConfirmDialog
        open={deleteId != null}
        title="Видалити склад?"
        message="Цю дію неможливо скасувати."
        confirmLabel="Видалити"
        danger
        loading={remove.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && remove.mutate(deleteId)}
      />
    </>
  )
}
