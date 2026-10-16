import { api } from './client'
import { ordersApi } from './orders.api'
import type { PagedResult } from '@/types/api'
import { isAxiosError } from 'axios'

export interface CustomerListItem {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  isActive: boolean
}

export function customerLabel(c: CustomerListItem) {
  return `${c.firstName} ${c.lastName}`.trim() || c.email || `#${c.id}`
}

async function listFromOrders(params?: Record<string, unknown>): Promise<PagedResult<CustomerListItem>> {
  const page = Math.max(1, Number(params?.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize) || 20))
  const search = String(params?.search ?? '')
    .trim()
    .toLowerCase()

  const orders = await ordersApi.list({ page: 1, pageSize: 200 })
  const map = new Map<number, CustomerListItem>()
  for (const o of orders.items) {
    if (!o.customerId || map.has(o.customerId)) continue
    const parts = (o.customerName || '').trim().split(/\s+/).filter(Boolean)
    map.set(o.customerId, {
      id: o.customerId,
      firstName: parts[0] ?? o.customerName ?? `Клієнт`,
      lastName: parts.slice(1).join(' '),
      email: '',
      phone: null,
      isActive: true,
    })
  }

  let items = [...map.values()].sort((a, b) => customerLabel(a).localeCompare(customerLabel(b), 'uk'))
  if (search) {
    items = items.filter(
      (c) =>
        customerLabel(c).toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        String(c.id).includes(search),
    )
  }

  const totalCount = items.length
  const totalPages = pageSize <= 0 ? 0 : Math.ceil(totalCount / pageSize)
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  }
}

export const customersApi = {
  list: async (params?: Record<string, unknown>) => {
    try {
      return (await api.get<PagedResult<CustomerListItem>>('/api/customers', { params })).data
    } catch (e) {
      const status = isAxiosError(e) ? e.response?.status : undefined
      // Backend may not have CustomersController until restart (404/502).
      if (status === 404 || status === 502 || status === 503) {
        return listFromOrders(params)
      }
      throw e
    }
  },
  get: async (id: number) => {
    try {
      return (await api.get<CustomerListItem>(`/api/customers/${id}`)).data
    } catch (e) {
      const status = isAxiosError(e) ? e.response?.status : undefined
      if (status === 404 || status === 502 || status === 503) {
        const page = await listFromOrders({ page: 1, pageSize: 200 })
        const found = page.items.find((c) => c.id === id)
        if (found) return found
      }
      throw e
    }
  },
}
