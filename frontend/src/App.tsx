import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CustomerLayout from './pages/CustomerLayout'
import Home from './pages/Home'
import ShopPage from './pages/ShopPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentResultPage from './pages/PaymentResultPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import ProductDetailPage from './pages/ProductDetailPage'
import BuildYourSetPage from './pages/BuildYourSetPage'
import OrdersPage from './pages/OrdersPage'
import AccountPage from './pages/AccountPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminCustomerDetailPage from './pages/admin/AdminCustomerDetailPage'
import AdminCouponsPage from './pages/admin/AdminCouponsPage'
import AdminSetsPage from './pages/admin/AdminSetsPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminProductFormPage from './pages/admin/AdminProductFormPage'
import { useCartStore } from './store/cartStore'

export default function App() {
  const fetchCart = useCartStore(s => s.fetchCart)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  return (
    <Routes>
      {/* Admin — own layout, no shared header */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id/edit" element={<AdminProductFormPage />} />
        <Route path="sets"      element={<AdminSetsPage />} />
        <Route path="orders"         element={<AdminOrdersPage />} />
        <Route path="orders/:id"     element={<AdminOrderDetailPage />} />
        <Route path="inventory"           element={<AdminInventoryPage />} />
        <Route path="customers/:id"       element={<AdminCustomerDetailPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="coupons"   element={<AdminCouponsPage />} />
        <Route path="settings"  element={<AdminSettingsPage />} />
      </Route>

      {/* Customer routes — shared header layout */}
      <Route element={<CustomerLayout />}>
        <Route path="/"                          element={<Home />} />
        <Route path="/shop"                      element={<ShopPage />} />
        <Route path="/shop/tops"                 element={<ShopPage />} />
        <Route path="/shop/bottoms"              element={<ShopPage />} />
        <Route path="/cart"                      element={<CartPage />} />
        <Route path="/login"                     element={<LoginPage />} />
        <Route path="/register"                  element={<RegisterPage />} />
        <Route path="/checkout"                  element={<CheckoutPage />} />
        <Route path="/payment/result"            element={<PaymentResultPage />} />
        <Route path="/order/:id/confirmation"    element={<OrderConfirmationPage />} />
        <Route path="/product/:slug"             element={<ProductDetailPage />} />
        <Route path="/build-your-set"            element={<BuildYourSetPage />} />
        <Route path="/orders"                    element={<OrdersPage />} />
        <Route path="/account"                   element={<AccountPage />} />
        <Route path="*"                          element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
