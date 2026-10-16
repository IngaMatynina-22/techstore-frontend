import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { useUrlState } from '@/hooks/useUrlState'
import { getErrorMessage, newIdempotencyKey } from '@/api/client'
import { MOVEMENT_LABELS, movementsApi, warehousesApi, type StockMovement } from '@/api/inventory.api'

type MovementDialogKind = 'receipt' | 'issue' | 'adjustment' | 'transfer' | null

const fmtDate = (s: string) => new Date(s).toLocaleString('uk-UA')
const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

export function MovementsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { get, page, pageSize, setMany } = useUrlState()

  const warehouseId = get('warehouseId')
  const sku = get('sku')
  const productName = get('productName')
  const movementType = get('movementType')

  const [draftSku, setDraftSku] = useState(sku)
  const [draftProductName, setDraftProductName] = useState(productName)
  const [dialog, setDialog] = useState<MovementDialogKind>(null)

  const [formWarehouseId, setFormWarehouseId] = useState('')
  const [formFromWarehouseId, setFormFromWarehouseId] = useState('')
  const [formToWarehouseId, setFormToWarehouseId] = useState('')
  const [formVariantId, setFormVariantId] = useState('')
  const [formQuantity, setFormQuantity] = useState('')
  const [formUnitCost, setFormUnitCost] = useState('')
  const [confirmCritical, setConfirmCritical] = useState(false)
  const [formComment, setFormComment] = useState('')

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      sku: sku || undefined,
      productName: productName || undefined,
      movementType: movementType !== '' ? Number(movementType) : undefined,
    }),
    [page, pageSize, warehouseId, sku, productName, movementType],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-movements', listParams],
    queryFn: () => movementsApi.list(listParams),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })

  const resetForm = () => {
    setFormWarehouseId(warehouseId || '')
    setFormFromWarehouseId(warehouseId || '')
    setFormToWarehouseId('')
    setFormVariantId('')
    setFormQuantity('')
    setFormUnitCost('')
    setFormComment('')
  }

  const openDialog = (kind: MovementDialogKind) => {
    resetForm()
    setDialog(kind)
  }

  const submitMovement = useMutation({
    mutationFn: async () => {
      const idempotencyKey = newIdempotencyKey()
      const quantity = Number(formQuantity)
      const variantId = Number(formVariantId)
      if (!Number.isFinite(variantId) || variantId <= 0) throw new Error('Вкажіть коректний ID варіанту')
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Кількість має бути більше 0')

      const comment = formComment.trim() || undefined
      const unitCost = formUnitCost.trim() ? Number(formUnitCost) : undefined

      if (dialog === 'receipt') {
        const warehouse = Number(formWarehouseId)
        if (!Number.isFinite(warehouse)) throw new Error('Оберіть склад')
        return movementsApi.receipt({ warehouseId: warehouse, variantId, quantity, unitCost, comment, idempotencyKey })
      }
      if (dialog === 'issue') {
        const warehouse = Number(formWarehouseId)
        if (!Number.isFinite(warehouse)) throw new Error('Оберіть склад')
        return movementsApi.issue({ warehouseId: warehouse, variantId, quantity, comment, idempotencyKey })
      }
      if (dialog === 'adjustment') {
        const warehouse = Number(formWarehouseId)
        if (!Number.isFinite(warehouse)) throw new Error('Оберіть склад')
        return movementsApi.adjustment({ warehouseId: warehouse, variantId, quantity, comment, idempotencyKey })
      }
      if (dialog === 'transfer') {
        const fromWarehouseId = Number(formFromWarehouseId)
        const toWarehouseId = Number(formToWarehouseId)
        if (!Number.isFinite(fromWarehouseId) || !Number.isFinite(toWarehouseId)) {
          throw new Error('Оберіть склади відправлення та отримання')
        }
        if (fromWarehouseId === toWarehouseId) throw new Error('Склади мають відрізнятися')
        return movementsApi.transfer({
          fromWarehouseId,
          toWarehouseId,
          variantId,
          quantity,
          comment,
          idempotencyKey,
        })
      }
      throw new Error('Невідома операція')
    },
    onSuccess: () => {
      enqueueSnackbar('Рух зареєстровано', { variant: 'success' })
      setDialog(null)
      void qc.invalidateQueries({ queryKey: ['stock-movements'] })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const columns: Column<StockMovement>[] = [
    {
      id: 'id',
      label: '№',
      render: (r) => (
        <Link component={RouterLink} to={`/inventory/movements/${r.id}`}>
          {r.id}
        </Link>
      ),
    },
    { id: 'date', label: 'Дата', render: (r) => fmtDate(r.createdAt) },
    { id: 'type', label: 'Тип', render: (r) => MOVEMENT_LABELS[r.movementType] ?? String(r.movementType) },
    { id: 'warehouse', label: 'Склад', render: (r) => r.warehouseName },
    { id: 'sku', label: 'SKU', render: (r) => r.sku },
    { id: 'product', label: 'Товар', render: (r) => r.productName },
    { id: 'variant', label: 'Варіант', render: (r) => r.variantName },
    { id: 'qty', label: 'Кількість', align: 'right', render: (r) => r.quantity },
    { id: 'before', label: 'До', align: 'right', render: (r) => r.quantityBefore },
    { id: 'after', label: 'Після', align: 'right', render: (r) => r.quantityAfter },
    { id: 'cost', label: 'Собівартість', align: 'right', render: (r) => fmtMoney(r.unitCost) },
  ]

  const dialogTitles: Record<Exclude<MovementDialogKind, null>, string> = {
    receipt: 'Надходження',
    issue: 'Списання',
    adjustment: 'Коригування',
    transfer: 'Переміщення',
  }

  return (
    <>
      <PageHeader
        title="Рухи запасів"
        description="Історія надходжень, списань та переміщень"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => openDialog('receipt')}>
              Надходження
            </Button>
            <Button variant="outlined" onClick={() => openDialog('issue')}>
              Списання
            </Button>
            <Button variant="outlined" onClick={() => openDialog('adjustment')}>
              Коригування
            </Button>
            <Button variant="outlined" onClick={() => openDialog('transfer')}>
              Переміщення
            </Button>
          </Stack>
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Склад</InputLabel>
          <Select
            label="Склад"
            value={warehouseId}
            onChange={(e) => setMany({ warehouseId: e.target.value, page: 1 })}
          >
            <MenuItem value="">Усі</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="SKU"
          value={draftSku}
          onChange={(e) => setDraftSku(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && setMany({ sku: draftSku, productName: draftProductName, page: 1 })
          }
          sx={{ minWidth: 120, flex: '1 1 100px' }}
        />
        <TextField
          size="small"
          label="Назва товару"
          value={draftProductName}
          onChange={(e) => setDraftProductName(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && setMany({ sku: draftSku, productName: draftProductName, page: 1 })
          }
          sx={{ minWidth: 150, flex: '1 1 140px' }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Тип руху</InputLabel>
          <Select
            label="Тип руху"
            value={movementType}
            onChange={(e) => setMany({ movementType: e.target.value, page: 1 })}
          >
            <MenuItem value="">Усі</MenuItem>
            {Object.entries(MOVEMENT_LABELS).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          color="primary"
          aria-label="Знайти"
          onClick={() => setMany({ sku: draftSku, productName: draftProductName, page: 1 })}
        >
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
        emptyTitle="Рухів не знайдено"
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => setMany({ pageSize: s, page: 1 })}
        onRowClick={(r) => navigate(`/inventory/movements/${r.id}`)}
      />

      <Dialog open={dialog != null} onClose={() => !submitMovement.isPending && setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog ? dialogTitles[dialog] : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialog === 'transfer' ? (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Зі складу</InputLabel>
                  <Select
                    label="Зі складу"
                    value={formFromWarehouseId}
                    onChange={(e) => setFormFromWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>На склад</InputLabel>
                  <Select
                    label="На склад"
                    value={formToWarehouseId}
                    onChange={(e) => setFormToWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>Склад</InputLabel>
                <Select
                  label="Склад"
                  value={formWarehouseId}
                  onChange={(e) => setFormWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              size="small"
              label="ID варіанту"
              type="number"
              value={formVariantId}
              onChange={(e) => setFormVariantId(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Кількість"
              type="number"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            {dialog === 'receipt' && (
              <TextField
                size="small"
                label="Закупівельна ціна (опційно)"
                type="number"
                value={formUnitCost}
                onChange={(e) => setFormUnitCost(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              />
            )}
            <TextField
              size="small"
              label="Коментар"
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={submitMovement.isPending}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color={dialog === 'issue' || dialog === 'adjustment' || dialog === 'transfer' ? 'warning' : 'primary'}
            onClick={() => {
              if (dialog === 'issue' || dialog === 'adjustment' || dialog === 'transfer') {
                setConfirmCritical(true)
              } else {
                submitMovement.mutate()
              }
            }}
            disabled={submitMovement.isPending}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmCritical}
        title="Підтвердити складську операцію?"
        message={
          dialog === 'issue'
            ? 'Списання зменшить фактичний залишок. Дію не можна скасувати автоматично.'
            : dialog === 'adjustment'
              ? 'Коригування змінить залишок до нового значення. Перевірте кількість.'
              : 'Переміщення спише товар з одного складу і оприбуткує на інший.'
        }
        confirmLabel="Підтвердити"
        danger={dialog === 'issue'}
        loading={submitMovement.isPending}
        onClose={() => setConfirmCritical(false)}
        onConfirm={() => {
          setConfirmCritical(false)
          submitMovement.mutate()
        }}
      />
    </>
  )
}
