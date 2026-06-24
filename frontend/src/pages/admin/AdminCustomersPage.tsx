import { useEffect, useState } from 'react'
import type { AdminCustomer } from '../../api/admin'
import { adminApi } from '../../api/admin'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [error,     setError]     = useState('')

  useEffect(() => {
    adminApi.listCustomers()
      .then(setCustomers)
      .catch(() => setError('Failed to load customers'))
  }, [])

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Customers</h1>

      {customers.length === 0 ? (
        <p className="text-[#8B7568] text-sm">No customers yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#ECE3D9] text-[#4A3F38]">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-right px-4 py-3">Orders</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-[#faf8f5]">
                  <td className="px-4 py-3 text-[#4A3F38] font-medium">{c.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-[#4A3F38]">{c.email}</td>
                  <td className="px-4 py-3 text-[#8B7568]">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.order_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-[#ECE3D9] text-[#8B7568]'
                    }`}>
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B7568] text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('en-EG', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
