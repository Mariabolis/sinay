import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Landing page for the Paymob redirect after payment.
 *
 * Paymob redirects here with params like ?success=true&id=123&...
 * We read the order ID we stored in sessionStorage before redirecting to the
 * iframe, then forward to the confirmation page.
 */
export default function PaymentResultPage() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()

  useEffect(() => {
    const orderId  = sessionStorage.getItem('pending_order_id')
    const success  = params.get('success')

    sessionStorage.removeItem('pending_order_id')

    if (orderId) {
      navigate(`/order/${orderId}/confirmation?paymob_success=${success}`, { replace: true })
    } else {
      // No order ID in storage (e.g. user opened this URL directly)
      navigate('/', { replace: true })
    }
  }, [navigate, params])

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <p className="font-body text-mocha text-[14px] tracking-wide">
        Processing your payment…
      </p>
    </div>
  )
}
