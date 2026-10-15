import { Button, Checkbox, FormControlLabel, Paper, Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/feedback/PageHeader'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { suppliersApi } from '@/api/purchasing.api'

const schema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function SupplierFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const supplierId = isNew ? 0 : Number(id)
  const navigate = useNavigate()

  const { data: supplier, isLoading, error, refetch } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersApi.get(supplierId),
    enabled: !isNew && Number.isFinite(supplierId),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: supplier
      ? {
          name: supplier.name,
          contactPerson: supplier.contactPerson ?? '',
          email: supplier.email ?? '',
          phone: supplier.phone ?? '',
          address: supplier.address ?? '',
          taxNumber: supplier.taxNumber ?? '',
          notes: supplier.notes ?? '',
          isActive: supplier.isActive,
        }
      : undefined,
    defaultValues: { name: '', isActive: true },
  })

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = {
        ...v,
        email: v.email || null,
        contactPerson: v.contactPerson || null,
        phone: v.phone || null,
        address: v.address || null,
        taxNumber: v.taxNumber || null,
        notes: v.notes || null,
      }
      return isNew ? suppliersApi.create(body) : suppliersApi.update(supplierId, body).then(() => suppliersApi.get(supplierId))
    },
    onSuccess: (s) => {
      enqueueSnackbar(isNew ? 'Постачальника створено' : 'Збережено', { variant: 'success' })
      navigate(`/purchasing/suppliers/${isNew ? (s as { id: number }).id : supplierId}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!isNew && error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (!isNew && (isLoading || !supplier)) return null

  return (
    <>
      <PageHeader
        title={isNew ? 'Новий постачальник' : supplier!.name}
        crumbs={[
          { label: 'Постачальники', to: '/purchasing/suppliers' },
          { label: isNew ? 'Створення' : 'Редагування' },
        ]}
      />
      <Paper sx={{ p: 3, maxWidth: 560 }}>
        <Stack component="form" spacing={2} onSubmit={handleSubmit((v) => save.mutate(v))}>
          <TextField label="Назва" {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
          <TextField label="Контактна особа" {...register('contactPerson')} />
          <TextField label="Email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <TextField label="Телефон" {...register('phone')} />
          <TextField label="Адреса" multiline {...register('address')} />
          <TextField label="ЄДРПОУ / ПДВ" {...register('taxNumber')} />
          <TextField label="Примітки" multiline {...register('notes')} />
          <FormControlLabel control={<Checkbox {...register('isActive')} defaultChecked />} label="Активний" />
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={isSubmitting || save.isPending}>
              Зберегти
            </Button>
            <Button onClick={() => navigate('/purchasing/suppliers')}>Скасувати</Button>
          </Stack>
        </Stack>
      </Paper>
    </>
  )
}
