import axios, { type AxiosError } from 'axios'
import type { ProblemDetails } from '@/types/api'

export const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

const TITLE_UA: Record<string, string> = {
  conflict: 'Конфлікт даних. Оновіть сторінку та спробуйте знову.',
  concurrency_conflict: 'Дані змінилися іншим користувачем. Оновіть і повторіть.',
  insufficient_stock: 'Недостатньо залишку на складі для цієї операції.',
  idempotency_conflict: 'Повторний запит із тим самим ключем, але іншими даними.',
  invalid_transition: 'Цей перехід статусу зараз недозволений.',
  validation: 'Перевірте введені дані.',
  not_found: 'Запис не знайдено.',
  forbidden: 'Недостатньо прав для цієї дії.',
}

export function getErrorMessage(error: unknown, fallback = 'Помилка запиту'): string {
  const ax = error as AxiosError<ProblemDetails & { message?: string }>
  if (!ax.response) {
    if (ax.code === 'ERR_NETWORK' || ax.message?.includes('Network')) {
      return 'Сервер недоступний. Перевірте, чи запущений backend.'
    }
    return ax.message || fallback
  }
  const data = ax.response.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.message) return data.message
  if (data.title && TITLE_UA[data.title]) return TITLE_UA[data.title]
  if (data.title && data.title !== 'One or more validation errors occurred.') return data.title
  if (data.errors) {
    const first = Object.values(data.errors).flat()[0]
    if (first) return first
  }
  return fallback
}

export function getErrorTitle(error: unknown): string | undefined {
  const ax = error as AxiosError<ProblemDetails>
  return ax.response?.data?.title
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/api/account/login')) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

export async function downloadFile(url: string, params?: Record<string, unknown>) {
  const res = await api.get(url, { params, responseType: 'blob' })
  const disposition = res.headers['content-disposition'] as string | undefined
  let filename = 'export.csv'
  const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  if (match?.[1]) filename = match[1].replace(/['"]/g, '')
  const blob = new Blob([res.data])
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function newIdempotencyKey() {
  return crypto.randomUUID()
}
