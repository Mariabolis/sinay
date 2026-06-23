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
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminCouponsPage from './pages/admin/AdminCouponsPage'
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
        <Route path="orders"   element={<AdminOrdersPage />} />
        <Route path="coupons"  element={<AdminCouponsPage />} />
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
      </Route>
    </Routes>
  )
}
