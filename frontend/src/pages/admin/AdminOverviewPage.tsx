import { useEffect, useState } from 'react'
import type { DashboardSummary } from '../../api/admin'
import { adminApi } from '../../api/admin'

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getSummary()
      .then(setData)
      .catch(() => setError('Failed to load dashboard summary'))
  }, [])

  if (error) return <p className="text-red-500">{error}</p>
  if (!data)  return <p className="text-[#8B7568]">Loading…</p>

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-[#4A3F38]">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total Revenue" value={`EGP ${data.total_revenue.toLocaleString()}`} />
        <StatCard label="Total Orders"  value={data.orders_count.toString()} />
        <StatCard label="Orders Today"  value={data.orders_today.toString()} />
      </div>

      {/* Top selling */}
      <section>
        <h2 className="text-base font-semibold text-[#4A3F38] mb-3">Top Selling Variants</h2>
        {data.top_selling_variants.length === 0 ? (
          <p className="text-sm text-[#8B7568]">No sales data yet.</p>
        ) : (
          <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-[#ECE3D9] text-[#4A3F38]">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Color</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">Units Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {data.top_selling_variants.map(v => (
                <tr key={v.variant_id}>
                  <td className="px-4 py-3 text-[#4A3F38]">{v.product_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-[#d8cfc5]"
                        style={{ background: v.color_hex }}
                      />
                      <span className="text-[#4A3F38]">{v.color_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4A3F38]">{v.size}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#4A3F38]">{v.total_sold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Low stock */}
      <section>
        <h2 className="text-base font-semibold text-[#4A3F38] mb-3">Low Stock Alerts</h2>
        {data.low_stock_variants.length === 0 ? (
          <p className="text-sm text-[#8B7568]">All variants are well-stocked.</p>
        ) : (
          <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-[#ECE3D9] text-[#4A3F38]">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Color</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE8]">
              {data.low_stock_variants.map(v => (
                <tr key={v.variant_id}>
                  <td className="px-4 py-3 text-[#4A3F38]">{v.product_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-[#d8cfc5]"
                        style={{ background: v.color_hex }}
                      />
                      <span className="text-[#4A3F38]">{v.color_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4A3F38]">{v.size}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${v.stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                      {v.stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm px-6 py-5">
      <p className="text-xs uppercase tracking-wide text-[#8B7568] mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#4A3F38]">{value}</p>
    </div>
  )
}
