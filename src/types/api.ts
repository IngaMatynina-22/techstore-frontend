export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}

export interface UserDto {
  id: number
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export type AttributeDataType = 0 | 1 | 2 | 3 | 4 // Text Number Boolean Select Decimal

export type StockMovementType =
  | 0 // Receipt
  | 1 // Issue
  | 2 // Adjustment
  | 3 // TransferOut
  | 4 // TransferIn
  | 5 // Sale
  | 6 // Return

export type PurchaseOrderStatus = 0 | 1 | 2 | 3 | 4 // Draft Confirmed PartiallyReceived Received Cancelled
export type ReturnRequestStatus = 0 | 1 | 2 | 3 | 4 | 5 // Requested Approved Rejected Received Restocked Closed
export type ReturnDisposition = 0 | 1 | 2 // RestockSellable QuarantineDamaged DoNotRestock
export type InventoryCountStatus = 0 | 1 | 2 | 3 | 4 // Draft InProgress InReview Applied Cancelled
export type DeliveryMethod = 0 | 1 | 2 | 3 // Pickup Courier NovaPoshta Other
export type CatalogImportMode = 0 | 1 | 2 | 3 // ValidateOnly Create UpdateBySku UpsertBySku
