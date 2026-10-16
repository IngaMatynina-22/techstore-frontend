import { useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Ban, CheckCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { BoolChip } from '@/components/feedback/StatusChip'
import { IconAction } from '@/components/actions/IconAction'
import { useUrlState } from '@/hooks/useUrlState'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/api/client'
import { usersApi, type AdminUser } from '@/api/admin.api'
import { fmtDateTime } from '@/features/reports/reportUtils'

const STAFF_ROLES = ['Admin', 'Manager'] as const

const schema = z.object({
  email: z.string().email('Некоректний email'),
  firstName: z.string().min(1, "Обов'язкове поле"),
  lastName: z.string().min(1, "Обов'язкове поле"),
  password: z.string().optional(),
  newPassword: z.string().optional(),
  isActive: z.boolean(),
  roles: z.array(z.string()).min(1, 'Оберіть хоча б одну роль'),
})

type FormValues = z.infer<typeof schema>

export function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const { get, page, pageSize, setMany } = useUrlState()
  const search = get('search')
  const [draft, setDraft] = useState(search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const params = useMemo(
    () => ({ page, pageSize, search: search || undefined }),
    [page, pageSize, search],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => usersApi.list(params),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      newPassword: '',
      isActive: true,
      roles: ['Manager'],
    },
  })

  const openCreate = () => {
    setEditUser(null)
    form.reset({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      newPassword: '',
      isActive: true,
      roles: ['Manager'],
    })
    setDialogOpen(true)
  }

  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    form.reset({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      password: '',
      newPassword: '',
      isActive: u.isActive,
      roles: u.roles.length ? u.roles : ['Manager'],
    })
    setDialogOpen(true)
  }

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      if (editUser) {
        return usersApi.update(editUser.id, {
          email: v.email,
          firstName: v.firstName,
          lastName: v.lastName,
          isActive: v.isActive,
          roles: v.roles,
          newPassword: v.newPassword?.trim() || null,
        })
      }
      if (!v.password || v.password.length < 6) {
        throw new Error('Пароль має містити щонайменше 6 символів')
      }
      return usersApi.create({
        email: v.email,
        password: v.password,
        firstName: v.firstName,
        lastName: v.lastName,
        roles: v.roles,
      })
    },
    onSuccess: () => {
      enqueueSnackbar(editUser ? 'Користувача оновлено' : 'Користувача створено', { variant: 'success' })
      setDialogOpen(false)
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      enqueueSnackbar('Користувача деактивовано', { variant: 'success' })
      setDeactivateId(null)
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const activate = useMutation({
    mutationFn: (id: number) => usersApi.activate(id),
    onSuccess: () => {
      enqueueSnackbar('Користувача активовано', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      enqueueSnackbar('Користувача видалено', { variant: 'success' })
      setDeleteId(null)
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<AdminUser>[] = [
    {
      id: 'name',
      label: 'Імʼя',
      render: (r) => `${r.firstName} ${r.lastName}`.trim() || '—',
    },
    { id: 'email', label: 'Email', render: (r) => r.email },
    { id: 'roles', label: 'Ролі', render: (r) => r.roles.join(', ') || '—' },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
    { id: 'at', label: 'Створено', render: (r) => fmtDateTime(r.createdAt) },
    {
      id: 'actions',
      label: '',
      width: 140,
      render: (r) => {
        const isSelf = me?.id === r.id
        return (
          <Stack direction="row" spacing={0.25}>
            <IconAction title="Редагувати" onClick={() => openEdit(r)}>
              <Pencil size={16} />
            </IconAction>
            {r.isActive ? (
              <IconAction
                title="Деактивувати"
                color="warning"
                disabled={isSelf}
                onClick={() => setDeactivateId(r.id)}
              >
                <Ban size={16} />
              </IconAction>
            ) : (
              <IconAction
                title="Активувати"
                color="success"
                disabled={activate.isPending}
                onClick={() => activate.mutate(r.id)}
              >
                <CheckCircle size={16} />
              </IconAction>
            )}
            <IconAction
              title="Видалити"
              color="error"
              disabled={isSelf}
              onClick={() => setDeleteId(r.id)}
            >
              <Trash2 size={16} />
            </IconAction>
          </Stack>
        )
      },
    },
  ]

  const onSubmit = form.handleSubmit((v) => save.mutate(v))

  return (
    <>
      <PageHeader
        title="Користувачі"
        description="Управління обліковими записами персоналу"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>
            Новий користувач
          </Button>
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="Пошук"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setMany({ search: draft, page: 1 })}
          sx={{ minWidth: 220, flex: '1 1 180px' }}
        />
        <IconButton color="primary" aria-label="Знайти" onClick={() => setMany({ search: draft, page: 1 })}>
          <Search size={18} />
        </IconButton>
      </Stack>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Користувачів немає"
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => setMany({ pageSize: s, page: 1 })}
      />

      <Dialog open={dialogOpen} onClose={() => !save.isPending && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? 'Редагування користувача' : 'Новий користувач'}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} sx={{ pt: 1 }} onSubmit={onSubmit}>
            <TextField
              label="Email"
              fullWidth
              error={!!form.formState.errors.email}
              helperText={form.formState.errors.email?.message}
              {...form.register('email')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Імʼя"
                fullWidth
                error={!!form.formState.errors.firstName}
                helperText={form.formState.errors.firstName?.message}
                {...form.register('firstName')}
              />
              <TextField
                label="Прізвище"
                fullWidth
                error={!!form.formState.errors.lastName}
                helperText={form.formState.errors.lastName?.message}
                {...form.register('lastName')}
              />
            </Stack>
            {!editUser ? (
              <TextField
                label="Пароль"
                type="password"
                fullWidth
                error={!!form.formState.errors.password}
                helperText={form.formState.errors.password?.message ?? 'Мін. 6 символів'}
                {...form.register('password')}
              />
            ) : (
              <TextField
                label="Новий пароль (необовʼязково)"
                type="password"
                fullWidth
                {...form.register('newPassword')}
              />
            )}
            {editUser && (
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                    label="Активний"
                  />
                )}
              />
            )}
            <FormControl component="fieldset" error={!!form.formState.errors.roles}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                Ролі
              </Typography>
              <Controller
                name="roles"
                control={form.control}
                render={({ field }) => (
                  <FormGroup row>
                    {STAFF_ROLES.map((role) => (
                      <FormControlLabel
                        key={role}
                        control={
                          <Checkbox
                            checked={field.value.includes(role)}
                            onChange={(_, checked) => {
                              field.onChange(
                                checked
                                  ? [...field.value, role]
                                  : field.value.filter((r) => r !== role),
                              )
                            }}
                          />
                        }
                        label={role}
                      />
                    ))}
                  </FormGroup>
                )}
              />
              {form.formState.errors.roles && (
                <Typography variant="caption" color="error">
                  {form.formState.errors.roles.message}
                </Typography>
              )}
            </FormControl>
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
        title="Деактивувати користувача?"
        message="Користувач не зможе увійти в систему."
        confirmLabel="Деактивувати"
        danger
        loading={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId != null && deactivate.mutate(deactivateId)}
      />
      <ConfirmDialog
        open={deleteId != null}
        title="Видалити користувача?"
        message="Обліковий запис буде видалено остаточно."
        confirmLabel="Видалити"
        danger
        loading={remove.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && remove.mutate(deleteId)}
      />
    </>
  )
}
