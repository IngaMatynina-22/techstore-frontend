import { api } from './client'
import type { AttributeDataType, PagedResult } from '@/types/api'

export interface ProductListItem {
  id: number
  name: string
  slug: string
  categoryName: string
  brandName?: string | null
  primarySku?: string | null
  minSellingPrice?: number | null
  maxSellingPrice?: number | null
  isActive: boolean
  createdAt: string
  variantsCount: number
}

export interface ProductVariant {
  id: number
  sku: string
  barcode?: string | null
  variantName: string
  purchasePrice: number
  sellingPrice: number
  oldPrice?: number | null
  weight?: number | null
  isActive: boolean
}

export interface ProductDetails {
  id: number
  name: string
  slug: string
  description?: string | null
  shortDescription?: string | null
  imageUrl?: string | null
  warrantyMonths?: number | null
  categoryId: number
  categoryName: string
  brandId?: number | null
  brandName?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
  variants: ProductVariant[]
}

export interface ProductVariantInput {
  sku: string
  barcode?: string | null
  variantName: string
  purchasePrice: number
  sellingPrice: number
  oldPrice?: number | null
  weight?: number | null
  isActive?: boolean
}

export interface CategoryListItem {
  id: number
  name: string
  slug: string
  parentId?: number | null
  parentName?: string | null
  sortOrder: number
  isActive: boolean
  childrenCount: number
  productsCount: number
}

export interface CategoryDetails extends CategoryListItem {
  description?: string | null
  imageUrl?: string | null
  createdAt: string
  updatedAt?: string | null
  children: CategoryListItem[]
}

export interface BrandListItem {
  id: number
  name: string
  websiteUrl?: string | null
  isActive: boolean
  productsCount: number
}

export interface BrandDetails {
  id: number
  name: string
  description?: string | null
  logoUrl?: string | null
  websiteUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
  productsCount: number
}

export interface AttributeOption {
  id: number
  value: string
  sortOrder: number
}

export interface AttributeDefinition {
  id: number
  categoryId: number
  categoryName: string
  name: string
  code: string
  dataType: AttributeDataType
  unit?: string | null
  isRequired: boolean
  isFilterable: boolean
  sortOrder: number
  options: AttributeOption[]
}

export interface VariantAttributeValue {
  id: number
  variantId: number
  attributeId: number
  attributeName: string
  dataType: AttributeDataType
  unit?: string | null
  value?: string | null
  optionId?: number | null
  optionValue?: string | null
}

export const productsApi = {
  list: (params: Record<string, unknown>) =>
    api.get<PagedResult<ProductListItem>>('/api/products', { params }).then((r) => r.data),
  get: (id: number) => api.get<ProductDetails>(`/api/products/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<ProductDetails>('/api/products', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/products/${id}`, body),
  deactivate: (id: number) => api.post(`/api/products/${id}/deactivate`),
  addVariant: (id: number, body: ProductVariantInput) =>
    api.post<ProductVariant>(`/api/products/${id}/variants`, body).then((r) => r.data),
  updateVariant: (id: number, variantId: number, body: ProductVariantInput) =>
    api.put(`/api/products/${id}/variants/${variantId}`, body),
}

export const categoriesApi = {
  list: (includeInactive = true) =>
    api.get<CategoryListItem[]>('/api/categories', { params: { includeInactive } }).then((r) => r.data),
  get: (id: number) => api.get<CategoryDetails>(`/api/categories/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<CategoryDetails>('/api/categories', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/categories/${id}`, body),
  deactivate: (id: number) => api.post(`/api/categories/${id}/deactivate`),
}

export const brandsApi = {
  list: (includeInactive = true) =>
    api.get<BrandListItem[]>('/api/brands', { params: { includeInactive } }).then((r) => r.data),
  get: (id: number) => api.get<BrandDetails>(`/api/brands/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<BrandDetails>('/api/brands', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/brands/${id}`, body),
  deactivate: (id: number) => api.post(`/api/brands/${id}/deactivate`),
}

export const attributesApi = {
  list: (categoryId?: number) =>
    api.get<AttributeDefinition[]>('/api/attributes', { params: { categoryId } }).then((r) => r.data),
  get: (id: number) => api.get<AttributeDefinition>(`/api/attributes/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) =>
    api.post<AttributeDefinition>('/api/attributes', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/attributes/${id}`, body),
  getVariantValues: (variantId: number) =>
    api.get<VariantAttributeValue[]>(`/api/attributes/variants/${variantId}/values`).then((r) => r.data),
  setVariantValues: (variantId: number, body: { attributeId: number; value?: string | null; optionId?: number | null }[]) =>
    api.put(`/api/attributes/variants/${variantId}/values`, body),
}
