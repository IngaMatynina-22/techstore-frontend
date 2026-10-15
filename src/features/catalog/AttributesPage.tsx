import { useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { enqueueSnackbar } from 'notistack'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { getErrorMessage } from '@/api/client'
import { attributesApi, categoriesApi, type AttributeDefinition } from '@/api/catalog.api'
import type { AttributeDataType } from '@/types/api'
import { useUrlState } from '@/hooks/useUrlState'

const DATA_TYPES: { value: AttributeDataType; label: string }[] = [
  { value: 0, label: 'Текст' },
  { value: 1, label: 'Число' },
  { value: 2, label: 'Так/ні' },
  { value: 3, label: 'Список' },
  { value: 4, label: 'Дробове' },
]

const optionSchema = z.object({ value: z.string().min(1), sortOrder: z.number() })
const schema = z
  .object({
    categoryId: z.number().min(1),
    name: z.string().min(1),
    code: z.string().min(1),
    dataType: z.custom<AttributeDataType>((v) => typeof v === 'number' && v >= 0 && v <= 4),
    unit: z.string().optional(),
    isRequired: z.boolean(),
    isFilterable: z.boolean(),
    sortOrder: z.number(),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.dataType === 3 && (!v.options || v.options.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Додайте варіанти для списку', path: ['options'] })
    }
  })
type FormValues = z.infer<typeof schema>

export function AttributesPage() {
  const qc = useQueryClient()
  const { get, setMany } = useUrlState()
  const categoryFilter = get('categoryId')
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ['attributes', categoryFilter],
    queryFn: () => attributesApi.list(categoryFilter ? Number(categoryFilter) : undefined),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: 0, name: '', code: '', dataType: 0, isRequired: false, isFilterable: false, sortOrder: 0, options: [] },
  })
  const dataType = form.watch('dataType')
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' })

  const openCreate = () => {
    setEditId(null)
    form.reset({
      categoryId: categoryFilter ? Number(categoryFilter) : categories[0]?.id ?? 0,
      name: '',
      code: '',
      dataType: 0,
      isRequired: false,
      isFilterable: false,
      sortOrder: 0,
      options: [{ value: '', sortOrder: 0 }],
    })
    setOpen(true)
  }
  const openEdit = (a: AttributeDefinition) => {
    setEditId(a.id)
    form.reset({
      categoryId: a.categoryId,
      name: a.name,
      code: a.code,
      dataType: a.dataType,
      unit: a.unit ?? '',
      isRequired: a.isRequired,
      isFilterable: a.isFilterable,
      sortOrder: a.sortOrder,
      options: a.options.length ? a.options.map((o) => ({ value: o.value, sortOrder: o.sortOrder })) : [{ value: '', sortOrder: 0 }],
    })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const body = { ...v, options: v.dataType === 3 ? v.options : undefined }
      if (editId) return attributesApi.update(editId, body)
      return attributesApi.create(body)
    },
    onSuccess: () => {
      enqueueSnackbar(editId ? 'Збережено' : 'Характеристику створено', { variant: 'success' })
      setOpen(false)
      void qc.invalidateQueries({ queryKey: ['attributes'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const typeLabel = (t: AttributeDataType) => DATA_TYPES.find((d) => d.value === t)?.label ?? String(t)

  const columns: Column<AttributeDefinition>[] = [
    { id: 'name', label: 'Назва', render: (r) => r.name },
    { id: 'code', label: 'Код', render: (r) => r.code },
    { id: 'cat', label: 'Категорія', render: (r) => r.categoryName },
    { id: 'type', label: 'Тип', render: (r) => typeLabel(r.dataType) },
    { id: 'req', label: "Обов'язк.", render: (r) => (r.isRequired ? 'Так' : 'Ні') },
    { id: 'actions', label: '', render: (r) => <Button size="small" onClick={() => openEdit(r)}>Редагувати</Button> },
  ]

  return (
    <>
      <PageHeader
        title="Характеристики"
        actions={<Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>Нова характеристика</Button>}
      />
      <FormControl size="small" sx={{ mb: 2, minWidth: 220 }}>
        <InputLabel>Категорія</InputLabel>
        <Select label="Категорія" value={categoryFilter} onChange={(e) => setMany({ categoryId: e.target.value })}>
          <MenuItem value="">Усі категорії</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Характеристик немає"
        page={1}
        pageSize={Math.max(rows.length, 10)}
        totalCount={rows.length}
        onPageChange={() => {}}
      />
      <Dialog open={open} onClose={() => !save.isPending && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Редагування' : 'Нова характеристика'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }} component="form" id="attr-form" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <Controller
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Категорія</InputLabel>
                  <Select label="Категорія" value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value))}>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <TextField label="Назва" {...form.register('name')} />
            <TextField label="Код" {...form.register('code')} />
            <Controller
              name="dataType"
              control={form.control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Тип даних</InputLabel>
                  <Select label="Тип даних" value={field.value} onChange={(e) => field.onChange(Number(e.target.value) as AttributeDataType)}>
                    {DATA_TYPES.map((d) => (
                      <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <TextField label="Одиниця" {...form.register('unit')} />
            <Controller
              name="isRequired"
              control={form.control}
              render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, v) => field.onChange(v)} />} label="Обов'язкова" />}
            />
            <Controller
              name="isFilterable"
              control={form.control}
              render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, v) => field.onChange(v)} />} label="У фільтрах" />}
            />
            <TextField type="number" label="Порядок" {...form.register('sortOrder', { valueAsNumber: true })} />
            {dataType === 3 && (
              <>
                <Typography variant="subtitle2">Варіанти списку</Typography>
                {fields.map((f, i) => (
                  <Stack key={f.id} direction="row" spacing={1}>
                    <TextField size="small" label="Значення" {...form.register(`options.${i}.value`)} sx={{ flex: 1 }} />
                    <TextField size="small" type="number" label="Порядок" {...form.register(`options.${i}.sortOrder`, { valueAsNumber: true })} />
                    <Button size="small" color="error" onClick={() => remove(i)}>×</Button>
                  </Stack>
                ))}
                <Button size="small" onClick={() => append({ value: '', sortOrder: fields.length })}>+ Варіант</Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button type="submit" form="attr-form" variant="contained" disabled={save.isPending}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
