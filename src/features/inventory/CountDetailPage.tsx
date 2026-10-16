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
import { Save, ClipboardCheck, Check, X } from 'lucide-react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { StatusChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { IconAction } from '@/components/actions/IconAction'
import { getErrorMessage } from '@/api/client'
import { countsApi } from '@/api/inventory.api'
import type { InventoryCountStatus } from '@/types/api'

const COUNT_STATUS: Record<InventoryCountStatus, { label: string; status: string }> = {
  0: { label: 'Чернетка', status: 'Draft' },
  1: { label: 'В процесі', status: 'InProgress' },
  2: { label: 'На перевірці', status: 'PendingReview' },
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
  const s = data?.status
  const canEditActuals = s === 0 || s === 1
  const canSubmitReview = s === 0 || s === 1
  const canApply = s === 2
  const canCancel = s != null && s !== 3 && s !== 4
  const showActions = canEditActuals || canSubmitReview || canApply || canCancel

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
      // #region agent log
      fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7481c3'},body:JSON.stringify({sessionId:'7481c3',runId:'pre-fix',hypothesisId:'B',location:'CountDetailPage.tsx:saveActuals',message:'setActuals payload',data:{sessionId,totalLines:data.lines.length,sentLines:lines.length,skippedEmpty:data.lines.length-lines.length,lineIds:lines.map(l=>l.lineId)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
    mutationFn: () => {
      // #region agent log
      const serverMissing = data?.lines.filter((l) => l.actualQuantity == null).map((l) => ({ id: l.id, sku: l.sku, server: l.actualQuantity, local: actuals[l.id] ?? null })) ?? []
      const localEmpty = data?.lines.filter((l) => !(actuals[l.id]?.trim())).map((l) => l.id) ?? []
      const localFilledServerNull = serverMissing.filter((x) => x.local != null && String(x.local).trim() !== '')
      fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7481c3'},body:JSON.stringify({sessionId:'7481c3',runId:'pre-fix',hypothesisId:'A',location:'CountDetailPage.tsx:submitReview',message:'submit-review preflight',data:{sessionId,status:data?.status,totalLines:data?.lines.length,serverMissingCount:serverMissing.length,localEmptyCount:localEmpty.length,localFilledButServerNull:localFilledServerNull.length,sample:localFilledServerNull.slice(0,5)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return countsApi.submitReview(sessionId)
    },
    onSuccess: () => {
      // #region agent log
      fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7481c3'},body:JSON.stringify({sessionId:'7481c3',runId:'pre-fix',hypothesisId:'D',location:'CountDetailPage.tsx:submitReview:onSuccess',message:'submit-review succeeded',data:{sessionId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      enqueueSnackbar('Надіслано на перевірку', { variant: 'success' })
      setConfirmAction(null)
      void qc.invalidateQueries({ queryKey: ['inventory-count', sessionId] })
    },
    onError: (e) => {
      // #region agent log
      fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7481c3'},body:JSON.stringify({sessionId:'7481c3',runId:'pre-fix',hypothesisId:'A',location:'CountDetailPage.tsx:submitReview:onError',message:'submit-review failed',data:{sessionId,error:getErrorMessage(e)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    },
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
          showActions ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {canEditActuals && (
                <IconAction title="Зберегти фактичні" disabled={pending} onClick={() => saveActuals.mutate()}>
                  <Save size={18} />
                </IconAction>
              )}
              {canSubmitReview && (
                <IconAction title="На перевірку" disabled={pending} onClick={() => setConfirmAction('submit')}>
                  <ClipboardCheck size={18} />
                </IconAction>
              )}
              {canApply && (
                <IconAction title="Застосувати" color="primary" disabled={pending} onClick={() => setConfirmAction('apply')}>
                  <Check size={18} />
                </IconAction>
              )}
              {canCancel && (
                <IconAction title="Скасувати" color="error" disabled={pending} onClick={() => setConfirmAction('cancel')}>
                  <X size={18} />
                </IconAction>
              )}
            </Stack>
          ) : undefined
        }
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0}
          sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
        >
          <BoxField label="Склад" value={data.warehouseName} />
          <BoxField label="Статус">
            {statusInfo ? <StatusChip label={statusInfo.label} status={statusInfo.status} /> : data.status}
          </BoxField>
          {data.snapshotTakenAt && (
            <BoxField label="Знімок" value={new Date(data.snapshotTakenAt).toLocaleString('uk-UA')} />
          )}
          {data.notes && <BoxField label="Примітки" value={data.notes} />}
          {data.adjustmentsApplied && (
            <Typography variant="body2" color="success.main" sx={{ alignSelf: 'center' }}>
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
                  {canEditActuals ? (
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
    <Box sx={{ minWidth: 140, flex: '1 1 140px' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      {children ?? <Typography variant="body2">{value}</Typography>}
    </Box>
  )
}
