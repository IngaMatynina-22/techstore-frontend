import { useMemo } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { getErrorMessage } from '@/api/client'
import { importsApi, type ImportRowResult } from '@/api/admin.api'
import { fmtDateTime, fmtNum } from '@/features/reports/reportUtils'

export function ImportBatchPage() {
  const { batchId } = useParams()
  const id = Number(batchId)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['import-batch', id],
    queryFn: () => importsApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const errorRows = useMemo(
    () =>
      (data?.rows ?? []).filter(
        (r) => r.errorMessage || /fail|error/i.test(r.status),
      ),
    [data?.rows],
  )

  const cols: Column<ImportRowResult>[] = [
    { id: 'row', label: 'Рядок', width: 80, render: (r) => r.rowNumber },
    { id: 'status', label: 'Статус', render: (r) => <StatusChip label={r.status} status={r.status} /> },
    { id: 'err', label: 'Помилка', render: (r) => r.errorMessage ?? '—' },
    {
      id: 'data',
      label: 'Дані',
      render: (r) => (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {r.rowData}
        </Typography>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={data ? `Імпорт #${data.id}` : 'Пакет імпорту'}
        description={data?.fileName}
        crumbs={[
          { label: 'Імпорт', to: '/data/import' },
          { label: data ? `#${data.id}` : batchId ?? '' },
        ]}
      />
      {data && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" sx={{ flexWrap: 'wrap' }} spacing={2}>
            <Typography variant="body2">
              <strong>Режим:</strong> {data.mode}
            </Typography>
            <StatusChip label={data.status} status={data.status} />
            <Typography variant="body2">
              Рядків: {fmtNum(data.totalRows)} · OK: {fmtNum(data.successfulRows)} · Помилки:{' '}
              {fmtNum(data.failedRows)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fmtDateTime(data.createdAt)}
              {data.completedAt ? ` → ${fmtDateTime(data.completedAt)}` : ''}
            </Typography>
          </Stack>
        </Paper>
      )}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Рядки з помилками ({errorRows.length})
      </Typography>
      <DataTable
        columns={cols}
        rows={errorRows}
        rowKey={(r) => r.rowNumber}
        loading={isLoading}
        error={error ? getErrorMessage(error) : !Number.isFinite(id) ? 'Невірний ідентифікатор' : null}
        onRetry={() => void refetch()}
        emptyTitle="Помилкових рядків немає"
        page={1}
        pageSize={Math.max(errorRows.length, 1)}
        totalCount={errorRows.length}
        onPageChange={() => {}}
      />
      {data && errorRows.length < (data.rows?.length ?? 0) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Показано лише рядки з помилками. Усього рядків у відповіді: {data.rows.length}
          </Typography>
        </Box>
      )}
    </>
  )
}
