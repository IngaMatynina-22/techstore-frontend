import { api } from './client'
import type { PagedResult, ReturnDisposition, ReturnRequestStatus } from '@/types/api'

export interface ReturnSummary {
  id: number
  returnNumber: string
  orderId: number
  orderNumber: string
  customerId: number
  customerName: string
  warehouseId: number
  status: ReturnRequestStatus
  inventoryApplied: boolean
  itemCount: number
  totalAmount: number
  createdAt: string
  approvedAt?: string | null
  receivedAt?: string | null
  closedAt?: string | null
}

export interface ReturnItem {
  id: number
  orderItemId: number
  variantId?: number | null
  skuSnapshot: string
  productNameSnapshot: string
  quantity: number
  unitPriceSnapshot: number
  lineTotal: number
  reasonCode?: string | null
  disposition: ReturnDisposition
}

export interface ReturnHistory {
  id: number
  oldStatus?: ReturnRequestStatus | null
  newStatus: ReturnRequestStatus
  changedBy?: number | null
  comment?: string | null
  changedAt: string
}

export interface ReturnDetails extends ReturnSummary {
  customerComment?: string | null
  staffComment?: string | null
  requestedByUserId?: number | null
  reviewedByUserId?: number | null
  updatedAt?: string | null
  rejectedAt?: string | null
  items: ReturnItem[]
  statusHistory: ReturnHistory[]
}

export const RETURN_STATUS: Record<number, string> = {
  0: 'Заявка',
  1: 'Схвалено',
  2: 'Відхилено',
  3: 'Прийнято',
  4: 'На складі',
  5: 'Закрито',
}

export const DISPOSITION: Record<number, string> = {
  0: 'Повернути в продаж',
  1: 'Карантин / пошкоджено',
  2: 'Не повертати на склад',
}

export const returnsApi = {
  list: (params: Record<string, unknown>) =>
    api.get<PagedResult<ReturnSummary>>('/api/returns', { params }).then((r) => r.data),
  get: (id: number) => api.get<ReturnDetails>(`/api/returns/${id}`).then((r) => r.data),
  history: (id: number) =>
    api.get<ReturnHistory[]>(`/api/returns/${id}/history`).then((r) => r.data),
  create: (body: Record<string, unknown>) =>
    api.post<ReturnDetails>('/api/returns', body).then((r) => r.data),
  approve: (id: number, comment?: string) => api.post(`/api/returns/${id}/approve`, { comment }),
  reject: (id: number, comment?: string) => api.post(`/api/returns/${id}/reject`, { comment }),
  receive: (id: number, comment?: string) => api.post(`/api/returns/${id}/receive`, { comment }),
  applyInventory: (id: number, comment?: string) =>
    api.post(`/api/returns/${id}/apply-inventory`, { comment }),
  close: (id: number, comment?: string) => api.post(`/api/returns/${id}/close`, { comment }),
}
