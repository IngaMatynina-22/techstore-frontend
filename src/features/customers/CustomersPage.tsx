import { useMemo, useState } from 'react'
import { IconButton, Stack, TextField } from '@mui/material'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { BoolChip } from '@/components/feedback/StatusChip'
import { useUrlState } from '@/hooks/useUrlState'
import { getErrorMessage } from '@/api/client'
import { customerLabel, customersApi, type CustomerListItem } from '@/api/customers.api'

export function CustomersPage() {
  const { get, page, pageSize, setMany } = useUrlState()
  const search = get('search')
  const [draft, setDraft] = useState(search)

  const params = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      includeInactive: true,
    }),
    [page, pageSize, search],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  })

  const columns: Column<CustomerListItem>[] = [
    { id: 'name', label: 'Імʼя', render: (r) => customerLabel(r) },
    { id: 'email', label: 'Email', render: (r) => r.email },
    { id: 'phone', label: 'Телефон', render: (r) => r.phone ?? '—' },
    { id: 'status', label: 'Статус', render: (r) => <BoolChip value={r.isActive} /> },
  ]

  return (
    <>
      <PageHeader title="Клієнти" description="Довідник клієнтів" />
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
        emptyTitle="Клієнтів немає"
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
      />
    </>
  )
}
