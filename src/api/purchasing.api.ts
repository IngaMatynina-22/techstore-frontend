import { api } from './client'
import type { PagedResult, PurchaseOrderStatus } from '@/types/api'

export interface Supplier {
  id: number
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  taxNumber?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export interface SupplierProduct {
  id: number
  supplierId: number
  variantId: number
  sku: string
  variantName: string
  productName: string
  supplierSku?: string | null
  supplyPrice: number
  deliveryDays?: number | null
  isPreferred: boolean
}

export interface PurchaseOrderSummary {
  id: number
  orderNumber: string
  supplierId: number
  supplierName: string
  warehouseId: number
  warehouseName: string
  status: PurchaseOrderStatus
  expectedDeliveryDate?: string | null
  itemCount: number
  totalAmount: number
  createdAt: string
  confirmedAt?: string | null
  fullyReceivedAt?: string | null
  cancelledAt?: string | null
}

export interface PurchaseOrderItem {
  id: number
  variantId: number
  skuSnapshot: string
  productNameSnapshot: string
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
  unitCost: number
  lineTotal: number
}

export interface PurchaseOrderDetails extends PurchaseOrderSummary {
  notes?: string | null
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderHistory {
  id: number
  oldStatus?: PurchaseOrderStatus | null
  newStatus: PurchaseOrderStatus
  changedBy?: number | null
  comment?: string | null
  changedAt: string
}

export const PO_STATUS: Record<number, string> = {
  0: 'Чернетка',
  1: 'Підтверджено',
  2: 'Частково прийнято',
  3: 'Прийнято',
  4: 'Скасовано',
}

export const suppliersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<PagedResult<Supplier> | Supplier[]>('/api/suppliers', { params }).then((r) => r.data),
  get: (id: number) => api.get<Supplier>(`/api/suppliers/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<Supplier>('/api/suppliers', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/suppliers/${id}`, body),
  remove: (id: number) => api.delete(`/api/suppliers/${id}`),
  products: (id: number) =>
    api.get<SupplierProduct[]>(`/api/suppliers/${id}/products`).then((r) => r.data),
  upsertProduct: (
    id: number,
    body: {
      variantId: number
      supplierSku?: string | null
      supplyPrice: number
      deliveryDays?: number | null
      isPreferred: boolean
    },
  ) => api.put(`/api/suppliers/${id}/products`, body),
  setProducts: (
    id: number,
    items: {
      variantId: number
      supplierSku?: string | null
      supplyPrice: number
      deliveryDays?: number | null
      isPreferred: boolean
    }[],
  ) => Promise.all(items.map((item) => api.put(`/api/suppliers/${id}/products`, item))),
}

export const purchaseOrdersApi = {
  list: (params: Record<string, unknown>) =>
    api.get<PagedResult<PurchaseOrderSummary>>('/api/purchase-orders', { params }).then((r) => r.data),
  get: (id: number) => api.get<PurchaseOrderDetails>(`/api/purchase-orders/${id}`).then((r) => r.data),
  history: (id: number) =>
    api.get<PurchaseOrderHistory[]>(`/api/purchase-orders/${id}/history`).then((r) => r.data),
  create: (body: Record<string, unknown>) =>
    api.post<PurchaseOrderDetails>('/api/purchase-orders', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/purchase-orders/${id}`, body),
  setItems: (id: number, items: Record<string, unknown>[]) =>
    api.put(`/api/purchase-orders/${id}/items`, { items }),
  confirm: (id: number) => api.post(`/api/purchase-orders/${id}/confirm`),
  cancel: (id: number, comment?: string) =>
    api.post(`/api/purchase-orders/${id}/cancel`, { comment }),
  receive: (id: number, body: Record<string, unknown>) =>
    api.post(`/api/purchase-orders/${id}/receive`, body).then((r) => r.data),
}
