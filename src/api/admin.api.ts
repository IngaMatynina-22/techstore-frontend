import { api, downloadFile } from './client'
import type { CatalogImportMode, PagedResult } from '@/types/api'

export interface SalesSummary {
  fromUtc: string
  toUtc: string
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  grossOrderTotal: number
  completedSalesTotal: number
  averageCompletedOrderValue: number
  returnLineTotal: number
  notes: string
}

export interface InventoryOverview {
  warehouseId?: number | null
  skuCount: number
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  lowStockSkuCount: number
  outOfStockSkuCount: number
  valuationByPurchasePrice: number
  notes: string
}

export interface PurchasingSummary {
  fromUtc: string
  toUtc: string
  purchaseOrderCount: number
  receivedLineQuantity: number
  receivedPurchaseTotal: number
  notes: string
}

export interface ImportRowResult {
  rowNumber: number
  status: string
  errorMessage?: string | null
  productId?: number | null
  rowData: string
}

export interface ImportBatch {
  id: number
  fileName: string
  mode: string
  importType: string
  status: string
  totalRows: number
  successfulRows: number
  failedRows: number
  createdAt: string
  completedAt?: string | null
  rows: ImportRowResult[]
}

export interface SettingDto {
  key: string
  value?: string | null
  description?: string | null
  updatedAt: string
}

export interface AuditLog {
  id: number
  userId?: number | null
  userName?: string | null
  action?: string
  entityType?: string
  entityId?: string | number
  details?: string
  createdAt: string
  [key: string]: unknown
}

export const reportsApi = {
  sales: (params?: Record<string, unknown>) =>
    api.get<SalesSummary>('/api/reports/sales/summary', { params }).then((r) => r.data),
  inventory: (params?: Record<string, unknown>) =>
    api.get<InventoryOverview>('/api/reports/inventory/overview', { params }).then((r) => r.data),
  purchasing: (params?: Record<string, unknown>) =>
    api.get<PurchasingSummary>('/api/reports/purchasing/summary', { params }).then((r) => r.data),
}

export const importsApi = {
  catalog: (file: File, mode: CatalogImportMode) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<ImportBatch>('/api/imports/catalog', form, {
        params: { mode },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  get: (batchId: number) => api.get<ImportBatch>(`/api/imports/${batchId}`).then((r) => r.data),
}

export const exportsApi = {
  products: () => downloadFile('/api/exports/products'),
  inventory: (warehouseId?: number) =>
    downloadFile('/api/exports/inventory', warehouseId ? { warehouseId } : undefined),
  orders: (fromUtc?: string, toUtc?: string) =>
    downloadFile('/api/exports/orders', { fromUtc, toUtc }),
}

export const settingsApi = {
  list: () => api.get<SettingDto[]>('/api/settings').then((r) => r.data),
  get: (key: string) => api.get<SettingDto>(`/api/settings/${key}`).then((r) => r.data),
  upsert: (key: string, body: { value?: string | null; description?: string | null }) =>
    api.put(`/api/settings/${key}`, body),
}

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<PagedResult<AuditLog>>('/api/audit-logs', { params }).then((r) => r.data),
}

export const healthApi = {
  live: () => api.get('/health/live').then((r) => r.data),
  ready: () => api.get('/health/ready').then((r) => r.data),
}
