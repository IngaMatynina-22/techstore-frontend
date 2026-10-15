import { useMemo, useState } from 'react'
import { Button, Stack, TextField } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { BoolChip } from '@/components/feedback/StatusChip'
import { useUrlState } from '@/hooks/useUrlState'
import { getErrorMessage } from '@/api/client'
import { suppliersApi, type Supplier } from '@/api/purchasing.api'
import type { PagedResult } from '@/types/api'

const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')

function normalizeList(data: PagedResult<Supplier> | Supplier[] | undefined) {
  if (!data) return { items: [] as Supplier[], totalCount: 0 }
  if (Array.isArray(data)) return { items: data, totalCount: data.length }
  return { items: data.items, totalCount: data.totalCount }
}

export function SuppliersPage() {
  const navigate = useNavigate()
  const { page, pageSize, search, setMany } = useUrlState()
  const [draft, setDraft] = useState(search)

  const listParams = useMemo(
    () => ({ page, pageSize, search: search || undefined }),
    [page, pageSize, search],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['suppliers', listParams],
    queryFn: () => suppliersApi.list(listParams),
  })
  const { items, totalCount } = normalizeList(data)

  const columns: Column<Supplier>[] = [
    {
      id: 'name',
      label: 'Назва',
      render: (r) => (
        <RouterLink to={`/purchasing/suppliers/${r.id}`} style={{ color: 'inherit' }}>
          {r.name}
        </RouterLink>
      ),
    },
    { id: 'contact', label: 'Контакт', render: (r) => r.contactPerson ?? '—' },
    { id: 'email', label: 'Email', render: (r) => r.email ?? '—' },
    { id: 'phone', label: 'Тел.', render: (r) => r.phone ?? '—' },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
    { id: 'created', label: 'Створено', render: (r) => fmtDt(r.createdAt) },
  ]

  return (
    <>
      <PageHeader
        title="Постачальники"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} component={RouterLink} to="/purchasing/suppliers/new">
            Новий постачальник
          </Button>
        }
      />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Пошук"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setMany({ search: draft, page: 1 })}
          sx={{ minWidth: 240 }}
        />
        <Button variant="outlined" onClick={() => setMany({ search: draft, page: 1 })}>
          Застосувати
        </Button>
      </Stack>
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Постачальників не знайдено"
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => setMany({ pageSize: s, page: 1 })}
        onRowClick={(r) => navigate(`/purchasing/suppliers/${r.id}`)}
      />
    </>
  )
}
