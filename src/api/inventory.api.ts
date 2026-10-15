import { api } from './client'
import type { PagedResult, StockMovementType } from '@/types/api'

export interface Warehouse {
  id: number
  name: string
  code: string
  address?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export interface InventoryItem {
  id: number
  warehouseId: number
  warehouseName: string
  warehouseCode: string
  variantId: number
  sku: string
  variantName: string
  productId: number
  productName: string
  brandName?: string | null
  categoryName: string
  quantityOnHand: number
  quantityReserved: number
  availableQuantity: number
  lowStockThreshold?: number | null
  isBelowThreshold: boolean
  updatedAt: string
}

export interface StockMovement {
  id: number
  warehouseId: number
  warehouseName: string
  variantId: number
  sku: string
  variantName: string
  productName: string
  movementType: StockMovementType
  quantity: number
  quantityBefore: number
  quantityAfter: number
  unitCost?: number | null
  referenceType?: string | null
  referenceId?: number | null
  transferGroupId?: string | null
  comment?: string | null
  userId?: number | null
  createdAt: string
}

export interface InventoryCountLine {
  id: number
  variantId: number
  sku: string
  inventoryItemId: number
  expectedQuantity: number
  actualQuantity?: number | null
  difference?: number | null
  appliedMovementId?: number | null
}

export interface InventoryCountSession {
  id: number
  sessionNumber: string
  warehouseId: number
  warehouseName: string
  status: number
  snapshotTakenAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  adjustmentsApplied: boolean
  notes?: string | null
  lines: InventoryCountLine[]
}

export const warehousesApi = {
  list: () => api.get<Warehouse[]>('/api/warehouses').then((r) => r.data),
  get: (id: number) => api.get<Warehouse>(`/api/warehouses/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<Warehouse>('/api/warehouses', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.put<Warehouse>(`/api/warehouses/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/warehouses/${id}`),
  summary: (id: number) => api.get(`/api/warehouses/${id}/summary`).then((r) => r.data),
  valuation: (id: number) => api.get(`/api/warehouses/${id}/valuation`).then((r) => r.data),
}

export const inventoryApi = {
  list: (params: Record<string, unknown>) =>
    api.get<PagedResult<InventoryItem>>('/api/inventory', { params }).then((r) => r.data),
  get: (warehouseId: number, variantId: number) =>
    api.get<InventoryItem>(`/api/inventory/${warehouseId}/${variantId}`).then((r) => r.data),
  lowStock: (params?: Record<string, unknown>) =>
    api.get<PagedResult<InventoryItem>>('/api/inventory/low-stock', { params }).then((r) => r.data),
  outOfStock: (params?: Record<string, unknown>) =>
    api.get<PagedResult<InventoryItem>>('/api/inventory/out-of-stock', { params }).then((r) => r.data),
  setThreshold: (variantId: number, lowStockThreshold: number | null) =>
    api.put(`/api/inventory/variants/${variantId}/low-stock-threshold`, { lowStockThreshold }),
  integrityReport: () => api.get('/api/inventory/integrity-report').then((r) => r.data),
}

export const movementsApi = {
  list: (params: Record<string, unknown>) =>
    api.get<PagedResult<StockMovement>>('/api/stock-movements', { params }).then((r) => r.data),
  get: (id: number) => api.get<StockMovement>(`/api/stock-movements/${id}`).then((r) => r.data),
  periodReport: (params: Record<string, unknown>) =>
    api.get('/api/stock-movements/reports/period', { params }).then((r) => r.data),
  receipt: (body: Record<string, unknown>) => api.post('/api/stock-movements/receipts', body).then((r) => r.data),
  issue: (body: Record<string, unknown>) => api.post('/api/stock-movements/issues', body).then((r) => r.data),
  adjustment: (body: Record<string, unknown>) =>
    api.post('/api/stock-movements/adjustments', body).then((r) => r.data),
  transfer: (body: Record<string, unknown>) =>
    api.post('/api/stock-movements/transfers', body).then((r) => r.data),
}

export const countsApi = {
  create: (body: { warehouseId: number; notes?: string }) =>
    api.post<InventoryCountSession>('/api/inventory-counts', body).then((r) => r.data),
  get: (id: number) => api.get<InventoryCountSession>(`/api/inventory-counts/${id}`).then((r) => r.data),
  setActuals: (id: number, lines: { lineId: number; actualQuantity: number }[]) =>
    api.put(`/api/inventory-counts/${id}/actuals`, { lines }),
  submitReview: (id: number) => api.post(`/api/inventory-counts/${id}/submit-review`),
  apply: (id: number) => api.post(`/api/inventory-counts/${id}/apply`),
  cancel: (id: number) => api.post(`/api/inventory-counts/${id}/cancel`),
}

export const MOVEMENT_LABELS: Record<number, string> = {
  0: 'Надходження',
  1: 'Списання',
  2: 'Коригування',
  3: 'Переміщення (вихід)',
  4: 'Переміщення (вхід)',
  5: 'Продаж',
  6: 'Повернення',
}
