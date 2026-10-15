import { api } from './client'
import type { DeliveryMethod, PagedResult } from '@/types/api'

export interface OrderSummary {
  id: number
  orderNumber: string
  customerId: number
  customerName: string
  statusId: number
  statusCode: string
  statusName: string
  warehouseId: number
  totalAmount: number
  hasActiveReservation: boolean
  createdAt: string
  confirmedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
}

export interface OrderItem {
  id: number
  variantId?: number | null
  productName: string
  variantName?: string | null
  sku: string
  quantity: number
  unitPrice: number
  discountAmount: number
  subtotal: number
}

export interface OrderDetails extends OrderSummary {
  customerEmail?: string | null
  customerPhone?: string | null
  shippingAddressId?: number | null
  deliveryMethod: DeliveryMethod
  deliveryAddress?: string | null
  comment?: string | null
  subtotal: number
  discountAmount: number
  deliveryCost: number
  replayFromIdempotency: boolean
  items: OrderItem[]
}

export interface OrderStatusHistory {
  id: number
  oldStatusId?: number | null
  oldStatusCode?: string | null
  newStatusId: number
  newStatusCode: string
  changedBy?: number | null
  comment?: string | null
  changedAt: string
}

export const ordersApi = {
  list: (params: Record<string, unknown>) =>
    api.get<PagedResult<OrderSummary>>('/api/orders', { params }).then((r) => r.data),
  get: (id: number) => api.get<OrderDetails>(`/api/orders/${id}`).then((r) => r.data),
  items: (id: number) => api.get<OrderItem[]>(`/api/orders/${id}/items`).then((r) => r.data),
  history: (id: number) =>
    api.get<OrderStatusHistory[]>(`/api/orders/${id}/history`).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<OrderDetails>('/api/orders', body).then((r) => r.data),
  confirm: (id: number) => api.post(`/api/orders/${id}/confirm`),
  startProcessing: (id: number) => api.post(`/api/orders/${id}/start-processing`),
  complete: (id: number) => api.post(`/api/orders/${id}/complete`),
  cancel: (id: number, comment?: string) => api.post(`/api/orders/${id}/cancel`, { comment }),
  summaryReport: (params?: Record<string, unknown>) =>
    api.get('/api/orders/reports/summary', { params }).then((r) => r.data),
  byPeriod: (params?: Record<string, unknown>) =>
    api.get('/api/orders/reports/by-period', { params }).then((r) => r.data),
}
