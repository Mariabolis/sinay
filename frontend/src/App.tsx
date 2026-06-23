import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import ShopPage from './pages/ShopPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentResultPage from './pages/PaymentResultPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import { useCartStore } from './store/cartStore'

export default function App() {
  const fetchCart = useCartStore(s => s.fetchCart)

  // Populate the cart count in the header on first load
  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/tops" element={<ShopPage />} />
        <Route path="/shop/bottoms" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/order/:id/confirmation" element={<OrderConfirmationPage />} />
      </Routes>
    </div>
  )
}
