import { Outlet } from 'react-router-dom'
import Header from '../components/Header'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <Header />
      <Outlet />
    </div>
  )
}
