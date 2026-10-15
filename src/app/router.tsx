import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { RequireAuth, RequireAdmin } from '@/app/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForbiddenPage, NotFoundPage } from '@/features/misc/ErrorPages'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductsPage } from '@/features/catalog/ProductsPage'
import { ProductDetailPage } from '@/features/catalog/ProductDetailPage'
import { ProductFormPage } from '@/features/catalog/ProductFormPage'
import { CategoriesPage } from '@/features/catalog/CategoriesPage'
import { BrandsPage } from '@/features/catalog/BrandsPage'
import { AttributesPage } from '@/features/catalog/AttributesPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { MovementsPage } from '@/features/inventory/MovementsPage'
import { MovementDetailPage } from '@/features/inventory/MovementDetailPage'
import { WarehousesPage } from '@/features/inventory/WarehousesPage'
import { WarehouseDetailPage } from '@/features/inventory/WarehouseDetailPage'
import { CountsPage } from '@/features/inventory/CountsPage'
import { CountDetailPage } from '@/features/inventory/CountDetailPage'
import { OrdersPage } from '@/features/orders/OrdersPage'
import { OrderDetailPage } from '@/features/orders/OrderDetailPage'
import { OrderCreatePage } from '@/features/orders/OrderCreatePage'
import { SuppliersPage } from '@/features/purchasing/SuppliersPage'
import { SupplierDetailPage } from '@/features/purchasing/SupplierDetailPage'
import { SupplierFormPage } from '@/features/purchasing/SupplierFormPage'
import { PurchaseOrdersPage } from '@/features/purchasing/PurchaseOrdersPage'
import { PurchaseOrderDetailPage } from '@/features/purchasing/PurchaseOrderDetailPage'
import { PurchaseOrderCreatePage } from '@/features/purchasing/PurchaseOrderCreatePage'
import { ReturnsPage } from '@/features/returns/ReturnsPage'
import { ReturnDetailPage } from '@/features/returns/ReturnDetailPage'
import { ReturnCreatePage } from '@/features/returns/ReturnCreatePage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { ImportPage } from '@/features/imports-exports/ImportPage'
import { ImportBatchPage } from '@/features/imports-exports/ImportBatchPage'
import { ExportPage } from '@/features/imports-exports/ExportPage'
import { SettingsPage } from '@/features/administration/SettingsPage'
import { AuditLogsPage } from '@/features/administration/AuditLogsPage'
import { SystemPage } from '@/features/administration/SystemPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="catalog/products" element={<ProductsPage />} />
          <Route path="catalog/products/new" element={<ProductFormPage />} />
          <Route path="catalog/products/:id" element={<ProductDetailPage />} />
          <Route path="catalog/products/:id/edit" element={<ProductFormPage />} />
          <Route path="catalog/categories" element={<CategoriesPage />} />
          <Route path="catalog/brands" element={<BrandsPage />} />
          <Route path="catalog/attributes" element={<AttributesPage />} />

          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/low-stock" element={<InventoryPage />} />
          <Route path="inventory/out-of-stock" element={<InventoryPage />} />
          <Route path="inventory/movements" element={<MovementsPage />} />
          <Route path="inventory/movements/:id" element={<MovementDetailPage />} />
          <Route path="inventory/counts" element={<CountsPage />} />
          <Route path="inventory/counts/new" element={<CountsPage />} />
          <Route path="inventory/counts/:id" element={<CountDetailPage />} />
          <Route path="inventory/warehouses" element={<WarehousesPage />} />
          <Route path="inventory/warehouses/:id" element={<WarehouseDetailPage />} />

          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<OrderCreatePage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />

          <Route path="purchasing/suppliers" element={<SuppliersPage />} />
          <Route path="purchasing/suppliers/new" element={<SupplierFormPage />} />
          <Route path="purchasing/suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="purchasing/suppliers/:id/edit" element={<SupplierFormPage />} />
          <Route path="purchasing/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="purchasing/purchase-orders/new" element={<PurchaseOrderCreatePage />} />
          <Route path="purchasing/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />

          <Route path="returns" element={<ReturnsPage />} />
          <Route path="returns/new" element={<ReturnCreatePage />} />
          <Route path="returns/:id" element={<ReturnDetailPage />} />

          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/sales" element={<ReportsPage />} />
          <Route path="reports/inventory" element={<ReportsPage />} />
          <Route path="reports/purchasing" element={<ReportsPage />} />

          <Route path="data/import" element={<ImportPage />} />
          <Route path="data/import/:batchId" element={<ImportBatchPage />} />
          <Route path="data/export" element={<ExportPage />} />

          <Route path="admin/settings" element={<SettingsPage />} />
          <Route path="admin/system" element={<SystemPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="admin/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
