import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { enqueueSnackbar } from 'notistack'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { BoolChip } from '@/components/feedback/StatusChip'
import { getErrorMessage } from '@/api/client'
import { brandsApi, type BrandListItem } from '@/api/catalog.api'

const schema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  description: z.string().optional(),
  websiteUrl: z.string().optional(),
  logoUrl: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function BrandsPage() {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  const openCreate = () => {
    setEditId(null)
    form.reset({ name: '', description: '', websiteUrl: '', logoUrl: '' })
    setOpen(true)
  }
  const openEdit = (b: BrandListItem) => {
    setEditId(b.id)
    form.reset({ name: b.name, websiteUrl: b.websiteUrl ?? '' })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async (v: FormValues) => (editId ? brandsApi.update(editId, v) : brandsApi.create(v)),
    onSuccess: () => {
      enqueueSnackbar(editId ? 'Збережено' : 'Бренд створено', { variant: 'success' })
      setOpen(false)
      void qc.invalidateQueries({ queryKey: ['brands'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => brandsApi.deactivate(id),
    onSuccess: () => {
      enqueueSnackbar('Бренд деактивовано', { variant: 'success' })
      setDeactivateId(null)
      void qc.invalidateQueries({ queryKey: ['brands'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<BrandListItem>[] = [
    { id: 'name', label: 'Назва', render: (r) => r.name },
    { id: 'site', label: 'Сайт', render: (r) => r.websiteUrl ?? '—' },
    { id: 'products', label: 'Товари', align: 'center', render: (r) => r.productsCount },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
    {
      id: 'actions',
      label: '',
      render: (r) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={() => openEdit(r)}>Редагувати</Button>
          {r.isActive && (
            <Button size="small" color="error" onClick={() => setDeactivateId(r.id)}>Деактивувати</Button>
          )}
        </Stack>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Бренди"
        actions={<Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>Новий бренд</Button>}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Брендів немає"
        page={1}
        pageSize={Math.max(rows.length, 10)}
        totalCount={rows.length}
        onPageChange={() => {}}
      />
      <Dialog open={open} onClose={() => !save.isPending && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Редагування бренду' : 'Новий бренд'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }} component="form" id="brand-form" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <TextField label="Назва" {...form.register('name')} error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} />
            <TextField label="Опис" multiline {...form.register('description')} />
            <TextField label="Сайт" {...form.register('websiteUrl')} />
            <TextField label="URL логотипу" {...form.register('logoUrl')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button type="submit" form="brand-form" variant="contained" disabled={save.isPending}>Зберегти</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={deactivateId != null}
        title="Деактивувати бренд?"
        message="Бренд стане неактивним у каталозі."
        confirmLabel="Деактивувати"
        danger
        loading={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId != null && deactivate.mutate(deactivateId)}
      />
    </>
  )
}
