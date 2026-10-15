import { useMemo, useState } from 'react'
import { Button, Stack, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { getErrorMessage } from '@/api/client'
import { auditApi, type AuditLog } from '@/api/admin.api'
import { useUrlState } from '@/hooks/useUrlState'
import { fmtDateTime } from '@/features/reports/reportUtils'

export function AuditLogsPage() {
  const { get, page, pageSize, setMany } = useUrlState()
  const entityType = get('entityType')
  const entityId = get('entityId')
  const [draftType, setDraftType] = useState(entityType)
  const [draftId, setDraftId] = useState(entityId)

  const params = useMemo(
    () => ({
      page,
      pageSize,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
    }),
    [page, pageSize, entityType, entityId],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.list(params),
  })

  const columns: Column<AuditLog>[] = [
    { id: 'at', label: 'Час', render: (r) => fmtDateTime(r.createdAt) },
    { id: 'user', label: 'Користувач', render: (r) => r.userName ?? (r.userId != null ? `#${r.userId}` : '—') },
    { id: 'action', label: 'Дія', render: (r) => r.action ?? '—' },
    { id: 'entity', label: 'Сутність', render: (r) => [r.entityType, r.entityId].filter(Boolean).join(' #') || '—' },
    {
      id: 'details',
      label: 'Деталі',
      render: (r) => (typeof r.details === 'string' ? r.details : r.details ? JSON.stringify(r.details) : '—'),
    },
  ]

  return (
    <>
      <PageHeader title="Журнал аудиту" description="Дії користувачів у системі" />
      <Stack  spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Тип сутності"
          value={draftType}
          onChange={(e) => setDraftType(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          label="ID сутності"
          value={draftId}
          onChange={(e) => setDraftId(e.target.value)}
          sx={{ minWidth: 140 }}
        />
        <Button
          variant="outlined"
          onClick={() => setMany({ entityType: draftType, entityId: draftId, page: 1 })}
        >
          Застосувати
        </Button>
      </Stack>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Записів немає"
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => setMany({ pageSize: s, page: 1 })}
      />
    </>
  )
}
