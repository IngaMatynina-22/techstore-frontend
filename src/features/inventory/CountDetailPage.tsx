import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { StatusChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { countsApi } from '@/api/inventory.api'
import type { InventoryCountStatus } from '@/types/api'

const COUNT_STATUS: Record<InventoryCountStatus, { label: string; status: string }> = {
  0: { label: 'Чернетка', status: 'Draft' },
  1: { label: 'В процесі', status: 'InProgress' },
  2: { label: 'На перевірці', status: 'InReview' },
  3: { label: 'Застосовано', status: 'Applied' },
  4: { label: 'Скасовано', status: 'Cancelled' },
}

export function CountDetailPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const qc = useQueryClient()

  const [actuals, setActuals] = useState<Record<number, string>>({})
  const [confirmAction, setConfirmAction] = useState<'submit' | 'apply' | 'cancel' | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-count', sessionId],
    queryFn: () => countsApi.get(sessionId),
    enabled: Number.isFinite(sessionId),
  })

  useEffect(() => {
    if (!data?.lines) return
    const next: Record<number, string> = {}
    for (const line of data.lines) {
      next[line.id] = line.actualQuantity != null ? String(line.actualQuantity) : ''
    }
    setActuals(next)
  }, [data?.lines, data?.id])

  const statusInfo = data ? COUNT_STATUS[data.status as InventoryCountStatus] : null
  const editable = data != null && data.status !== 3 && data.status !== 4

  const saveActuals = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('Немає даних')
      const lines = data.lines
        .map((line) => {
          const raw = actuals[line.id]?.trim()
          if (raw === '') return null
          const actualQuantity = Number(raw)
          if (!Number.isFinite(actualQuantity)) throw new Error(`Некоректна кількість для ${line.sku}`)
          return { lineId: line.id, actualQuantity }
        })
        .filter(Boolean) as { lineId: number; actualQuantity: number }[]
      if (!lines.length) throw new Error('Заповніть хоча б один фактичний залишок')
      return countsApi.setActuals(sessionId, lines)
    },
    onSuccess: () => {
      enqueueSnackbar('Фактичні залишки збережено', { variant: 'success' })
      void qc.invalidateQueries({ queryKey: ['inventory-count', sessionId] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const submitReview = useMutation({
    mutationFn: () => countsApi.submitReview(sessionId),
    onSuccess: () => {
      enqueueSnackbar('Надіслано на перевірку', { variant: 'success' })
      setConfirmAction(null)
      void qc.invalidateQueries({ queryKey: ['inventory-count', sessionId] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const apply = useMutation({
    mutationFn: () => countsApi.apply(sessionId),
    onSuccess: () => {
      enqueueSnackbar('Коригування застосовано', { variant: 'success' })
      setConfirmAction(null)
      void qc.invalidateQueries({ queryKey: ['inventory-count', sessionId] })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const cancel = useMutation({
    mutationFn: () => countsApi.cancel(sessionId),
    onSuccess: () => {
      enqueueSnackbar('Інвентаризацію скасовано', { variant: 'success' })
      setConfirmAction(null)
      void qc.invalidateQueries({ queryKey: ['inventory-count', sessionId] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const linesWithDiff = useMemo(() => {
    if (!data) return []
    return data.lines.map((line) => {
      const raw = actuals[line.id]
      const actual = raw?.trim() === '' ? null : Number(raw)
      const difference =
        actual != null && Number.isFinite(actual) ? actual - line.expectedQuantity : line.difference
      return { ...line, actual, difference }
    })
  }, [data, actuals])

  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return null

  const pending = saveActuals.isPending || submitReview.isPending || apply.isPending || cancel.isPending

  return (
    <>
      <PageHeader
        title={`Інвентаризація ${data.sessionNumber}`}
        crumbs={[
          { label: 'Інвентаризація', to: '/inventory/counts' },
          { label: data.sessionNumber },
        ]}
        actions={
          editable ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button variant="outlined" disabled={pending} onClick={() => saveActuals.mutate()}>
                Зберегти фактичні
              </Button>
              <Button variant="outlined" disabled={pending} onClick={() => setConfirmAction('submit')}>
                На перевірку
              </Button>
              <Button variant="contained" disabled={pending} onClick={() => setConfirmAction('apply')}>
                Застосувати
              </Button>
              <Button color="error" variant="outlined" disabled={pending} onClick={() => setConfirmAction('cancel')}>
                Скасувати
              </Button>
            </Stack>
          ) : undefined
        }
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={3} sx={{ flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', alignItems: { sm: 'center' } }}>
          <BoxField label="Склад" value={data.warehouseName} />
          <BoxField label="Статус">
            {statusInfo ? <StatusChip label={statusInfo.label} status={statusInfo.status} /> : data.status}
          </BoxField>
          {data.snapshotTakenAt && (
            <BoxField label="Знімок" value={new Date(data.snapshotTakenAt).toLocaleString('uk-UA')} />
          )}
          {data.notes && <BoxField label="Примітки" value={data.notes} />}
          {data.adjustmentsApplied && (
            <Typography variant="body2" color="success.main">
              Коригування застосовано
            </Typography>
          )}
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Очікувано</TableCell>
              <TableCell align="right">Фактично</TableCell>
              <TableCell align="right">Різниця</TableCell>
              <TableCell>Рух</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {linesWithDiff.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.sku}</TableCell>
                <TableCell align="right">{line.expectedQuantity}</TableCell>
                <TableCell align="right">
                  {editable ? (
                    <TextField
                      size="small"
                      type="number"
                      value={actuals[line.id] ?? ''}
                      onChange={(e) => setActuals((prev) => ({ ...prev, [line.id]: e.target.value }))}
                      sx={{ width: 100 }}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    />
                  ) : (
                    (line.actualQuantity ?? '—')
                  )}
                </TableCell>
                <TableCell align="right">{line.difference ?? '—'}</TableCell>
                <TableCell>
                  {line.appliedMovementId ? (
                    <Button
                      size="small"
                      component={RouterLink}
                      to={`/inventory/movements/${line.appliedMovementId}`}
                    >
                      №{line.appliedMovementId}
                    </Button>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={confirmAction === 'submit'}
        title="Надіслати на перевірку?"
        message="Після цього редагування може бути обмежено."
        confirmLabel="Надіслати"
        loading={submitReview.isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => submitReview.mutate()}
      />
      <ConfirmDialog
        open={confirmAction === 'apply'}
        title="Застосувати коригування?"
        message="Будуть створені рухи запасів за різницями інвентаризації."
        confirmLabel="Застосувати"
        loading={apply.isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => apply.mutate()}
      />
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title="Скасувати інвентаризацію?"
        message="Сесію буде позначено як скасовану."
        confirmLabel="Скасувати"
        danger
        loading={cancel.isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => cancel.mutate()}
      />
    </>
  )
}

function BoxField({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children ?? <Typography variant="body2">{value}</Typography>}
    </Box>
  )
}
