import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { enqueueSnackbar } from 'notistack'
import { Ban, CheckCircle, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { BoolChip } from '@/components/feedback/StatusChip'
import { IconAction } from '@/components/actions/IconAction'
import { getErrorMessage } from '@/api/client'
import { categoriesApi, type CategoryListItem } from '@/api/catalog.api'

const schema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  slug: z.string().optional(),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number(),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function collectDescendants(all: CategoryListItem[], rootId: number): Set<number> {
  const ids = new Set<number>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const c of all) {
      if (c.parentId != null && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        changed = true
      }
    }
  }
  return ids
}

export function CategoriesPage() {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', sortOrder: 0, parentId: null } })

  const forbiddenParents = useMemo(
    () => (editId != null ? collectDescendants(rows, editId) : new Set<number>()),
    [editId, rows],
  )
  const parentOptions = rows.filter((c) => !forbiddenParents.has(c.id))

  const openCreate = () => {
    setEditId(null)
    form.reset({ name: '', slug: '', parentId: null, sortOrder: 0, description: '' })
    setOpen(true)
  }
  const openEdit = (c: CategoryListItem) => {
    setEditId(c.id)
    form.reset({ name: c.name, slug: c.slug, parentId: c.parentId ?? null, sortOrder: c.sortOrder, description: '' })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const body = { ...v, parentId: v.parentId ?? null }
      if (editId) return categoriesApi.update(editId, body)
      return categoriesApi.create(body)
    },
    onSuccess: () => {
      enqueueSnackbar(editId ? 'Збережено' : 'Категорію створено', { variant: 'success' })
      setOpen(false)
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => categoriesApi.deactivate(id),
    onSuccess: () => {
      enqueueSnackbar('Категорію деактивовано', { variant: 'success' })
      setDeactivateId(null)
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const activate = useMutation({
    mutationFn: (r: CategoryListItem) => categoriesApi.activate(r),
    onSuccess: () => {
      enqueueSnackbar('Категорію активовано', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<CategoryListItem>[] = [
    { id: 'name', label: 'Назва', render: (r) => r.name },
    { id: 'slug', label: 'Slug', render: (r) => r.slug },
    { id: 'parent', label: 'Батьківська', render: (r) => r.parentName ?? '—' },
    { id: 'sort', label: 'Порядок', align: 'center', render: (r) => r.sortOrder },
    { id: 'products', label: 'Товари', align: 'center', render: (r) => r.productsCount },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
    {
      id: 'actions',
      label: '',
      width: 88,
      render: (r) => (
        <Stack direction="row" spacing={0.25}>
          <IconAction title="Редагувати" onClick={() => openEdit(r)}>
            <Pencil size={16} />
          </IconAction>
          {r.isActive ? (
            <IconAction title="Деактивувати" color="error" onClick={() => setDeactivateId(r.id)}>
              <Ban size={16} />
            </IconAction>
          ) : (
            <IconAction
              title="Активувати"
              color="success"
              disabled={activate.isPending}
              onClick={() => activate.mutate(r)}
            >
              <CheckCircle size={16} />
            </IconAction>
          )}
        </Stack>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Категорії"
        actions={<Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>Нова категорія</Button>}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Категорій немає"
        page={1}
        pageSize={Math.max(rows.length, 10)}
        totalCount={rows.length}
        onPageChange={() => {}}
      />
      <Dialog open={open} onClose={() => !save.isPending && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Редагування' : 'Нова категорія'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }} component="form" id="cat-form" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <TextField label="Назва" {...form.register('name')} error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} />
            <TextField label="Slug" {...form.register('slug')} />
            <Controller
              name="parentId"
              control={form.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Батьківська</InputLabel>
                  <Select
                    label="Батьківська"
                    value={field.value == null ? '' : String(field.value)}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <MenuItem value="">—</MenuItem>
                    {parentOptions.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <TextField type="number" label="Порядок сортування" {...form.register('sortOrder', { valueAsNumber: true })} />
            <TextField label="Опис" multiline {...form.register('description')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button type="submit" form="cat-form" variant="contained" disabled={save.isPending}>Зберегти</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={deactivateId != null}
        title="Деактивувати категорію?"
        message="Категорія стане неактивною в каталозі."
        confirmLabel="Деактивувати"
        danger
        loading={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId != null && deactivate.mutate(deactivateId)}
      />
    </>
  )
}
