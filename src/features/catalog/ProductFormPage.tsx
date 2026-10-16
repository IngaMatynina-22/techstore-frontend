import { useEffect } from 'react'
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { X } from 'lucide-react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { brandsApi, categoriesApi, productsApi } from '@/api/catalog.api'

const variantSchema = z.object({
  sku: z.string().min(1, "Обов'язкове поле"),
  variantName: z.string().min(1, "Обов'язкове поле"),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  barcode: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1, "Обов'язкове поле"),
  slug: z.string().optional(),
  categoryId: z.number().min(1, 'Оберіть категорію'),
  brandId: z.number().nullable().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  warrantyMonths: z.number().int().min(0, 'Гарантія не може бути від’ємною').optional().nullable(),
  imageUrl: z.string().optional(),
  variants: z.array(variantSchema).min(1, 'Додайте хоча б один варіант'),
})

const editSchema = createSchema.omit({ variants: true })

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

function ProductFields({
  control,
  register,
  errors,
  categories,
  brands,
}: {
  control: Control<EditForm>
  register: UseFormRegister<EditForm>
  errors: Partial<Record<keyof EditForm, { message?: string }>>
  categories: { id: number; name: string }[]
  brands: { id: number; name: string }[]
}) {
  return (
    <Stack spacing={2}>
      <TextField label="Назва" {...register('name')} error={!!errors.name} helperText={errors.name?.message as string} />
      <TextField label="Slug" {...register('slug')} />
      <Controller
        name="categoryId"
        control={control}
        render={({ field }) => (
          <FormControl fullWidth error={!!errors.categoryId}>
            <InputLabel>Категорія</InputLabel>
            <Select label="Категорія" value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value))}>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
      <Controller
        name="brandId"
        control={control}
        render={({ field }) => (
          <FormControl fullWidth>
            <InputLabel>Бренд</InputLabel>
            <Select
              label="Бренд"
              value={field.value == null ? '' : String(field.value)}
              onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
            >
              <MenuItem value="">—</MenuItem>
              {brands.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
      <TextField label="Короткий опис" multiline {...register('shortDescription')} />
      <TextField label="Опис" multiline rows={3} {...register('description')} />
      <TextField
        type="number"
        label="Гарантія (міс.)"
        {...register('warrantyMonths', { valueAsNumber: true })}
        error={!!errors.warrantyMonths}
        helperText={errors.warrantyMonths?.message as string}
        slotProps={{ htmlInput: { min: 0, step: 1 } }}
      />
      <TextField label="URL зображення" {...register('imageUrl')} />
    </Stack>
  )
}

export function ProductFormPage() {
  const { id } = useParams()
  const isCreate = !id || id === 'new'
  const productId = isCreate ? 0 : Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() })
  const { data: product, error, isLoading, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId),
    enabled: !isCreate && Number.isFinite(productId),
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      categoryId: 0,
      brandId: null,
      variants: [{ sku: '', variantName: '', purchasePrice: 0, sellingPrice: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control: createForm.control, name: 'variants' })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', categoryId: 0, brandId: null },
  })

  useEffect(() => {
    if (product && !isCreate) {
      editForm.reset({
        name: product.name,
        slug: product.slug,
        categoryId: product.categoryId,
        brandId: product.brandId ?? null,
        shortDescription: product.shortDescription ?? '',
        description: product.description ?? '',
        warrantyMonths: product.warrantyMonths ?? null,
        imageUrl: product.imageUrl ?? '',
      })
    }
  }, [product, isCreate, editForm])

  const saveCreate = useMutation({
    mutationFn: (body: CreateForm) => productsApi.create(body as unknown as Record<string, unknown>),
    onSuccess: (p) => {
      enqueueSnackbar('Товар створено', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['products'] })
      navigate(`/catalog/products/${p.id}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const saveEdit = useMutation({
    mutationFn: (body: EditForm) => productsApi.update(productId, body as Record<string, unknown>),
    onSuccess: () => {
      enqueueSnackbar('Збережено', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['product', productId] })
      navigate(`/catalog/products/${productId}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  if (!isCreate && error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (!isCreate && (isLoading || !product)) return null

  return (
    <>
      <PageHeader
        title={isCreate ? 'Новий товар' : 'Редагування товару'}
        crumbs={[
          { label: 'Товари', to: '/catalog/products' },
          ...(isCreate ? [{ label: 'Новий' }] : [{ label: product!.name, to: `/catalog/products/${productId}` }, { label: 'Редагування' }]),
        ]}
      />
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        {isCreate ? (
          <Stack component="form" spacing={3} onSubmit={createForm.handleSubmit((v) => saveCreate.mutate(v))}>
            <ProductFields
              control={createForm.control as unknown as Control<EditForm>}
              register={createForm.register as UseFormRegister<EditForm>}
              errors={createForm.formState.errors}
              categories={categories}
              brands={brands}
            />
            <Typography variant="subtitle1">Варіанти</Typography>
            {fields.map((f, i) => (
              <Stack
                key={f.id}
                direction="row"
                spacing={1.5}
                sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}
              >
                <TextField
                  size="small"
                  label="SKU"
                  {...createForm.register(`variants.${i}.sku`)}
                  sx={{ minWidth: 120, flex: '1 1 120px' }}
                />
                <TextField
                  size="small"
                  label="Назва"
                  {...createForm.register(`variants.${i}.variantName`)}
                  sx={{ minWidth: 140, flex: '2 1 160px' }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Закуп."
                  {...createForm.register(`variants.${i}.purchasePrice`, { valueAsNumber: true })}
                  sx={{ minWidth: 110, flex: '1 1 110px' }}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Продаж"
                  {...createForm.register(`variants.${i}.sellingPrice`, { valueAsNumber: true })}
                  sx={{ minWidth: 110, flex: '1 1 110px' }}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
                {fields.length > 1 && (
                  <IconButton size="small" color="error" aria-label="Видалити варіант" onClick={() => remove(i)}>
                    <X size={16} />
                  </IconButton>
                )}
              </Stack>
            ))}
            <Button size="small" onClick={() => append({ sku: '', variantName: '', purchasePrice: 0, sellingPrice: 0 })}>
              + Варіант
            </Button>
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={saveCreate.isPending}>Створити</Button>
              <Button component={RouterLink} to="/catalog/products">Скасувати</Button>
            </Stack>
          </Stack>
        ) : (
          <Stack component="form" spacing={3} onSubmit={editForm.handleSubmit((v) => saveEdit.mutate(v))}>
            <ProductFields
              control={editForm.control}
              register={editForm.register}
              errors={editForm.formState.errors}
              categories={categories}
              brands={brands}
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={saveEdit.isPending}>Зберегти</Button>
              <Button component={RouterLink} to={`/catalog/products/${productId}`}>Скасувати</Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </>
  )
}
