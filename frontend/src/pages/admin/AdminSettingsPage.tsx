import { useEffect, useState } from 'react'
import type { ShippingZone } from '../../api/admin'
import { adminApi } from '../../api/admin'

// Grouped by region for a cleaner UI
const REGIONS: { label: string; govs: string[] }[] = [
  {
    label: 'Greater Cairo',
    govs:  ['Cairo', 'Giza', 'Qalyubia'],
  },
  {
    label: 'Alexandria & Delta',
    govs:  ['Alexandria', 'Beheira', 'Dakahlia', 'Damietta', 'Gharbiya', 'Kafr El Sheikh', 'Menofia', 'Sharkia'],
  },
  {
    label: 'Canal Zone',
    govs:  ['Ismailia', 'Port Said', 'Suez'],
  },
  {
    label: 'Middle Egypt',
    govs:  ['Beni Suef', 'Fayoum', 'Minya'],
  },
  {
    label: 'Upper Egypt',
    govs:  ['Assiut', 'Aswan', 'Luxor', 'Qena', 'Sohag'],
  },
  {
    label: 'Remote / Border',
    govs:  ['Matruh', 'New Valley', 'North Sinai', 'Red Sea', 'South Sinai'],
  },
]

export default function AdminSettingsPage() {
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.listShipping()
      .then(setZones)
      .catch(() => setError('Failed to load shipping zones'))
  }, [])

  const handleSave = async (governorate: string, fee: number) => {
    const updated = await adminApi.updateShipping(governorate, fee)
    setZones(z => z.map(x => (x.governorate === governorate ? updated : x)))
  }

  const feeMap = Object.fromEntries(zones.map(z => [z.governorate, z.fee]))

  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#4A3F38]">Shipping Fees</h1>
        <p className="text-sm text-[#8B7568] mt-1">
          Set the delivery fee for each Egyptian governorate. Changes take effect immediately.
        </p>
      </div>

      {REGIONS.map(region => (
        <div key={region.label} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[#F4EEE8] border-b border-[#ECE3D9]">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-[#8B7568]">
              {region.label}
            </h2>
          </div>
          <div className="divide-y divide-[#F4EEE8]">
            {region.govs.map(gov => (
              <ZoneRow
                key={gov}
                governorate={gov}
                fee={feeMap[gov] ?? 75}
                onSave={handleSave}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── ZoneRow ───────────────────────────────────────────────────────────────────

interface ZoneRowProps {
  governorate: string
  fee:         number
  onSave:      (gov: string, fee: number) => Promise<void>
}

function ZoneRow({ governorate, fee: initialFee, onSave }: ZoneRowProps) {
  const [value,  setValue]  = useState(String(initialFee))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const dirty = value !== String(initialFee) && value !== ''

  const save = async () => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) { alert('Enter a valid fee'); return }
    setSaving(true)
    try {
      await onSave(governorate, num)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span className="flex-1 text-sm text-[#4A3F38]">{governorate}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#8B7568]">EGP</span>
        <input
          type="number"
          min={0}
          step={5}
          className="w-20 text-right text-[#4A3F38] bg-transparent border-b border-[#d8cfc5]
                     focus:border-[#8B7568] focus:outline-none transition-colors py-0.5 text-sm"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      </div>
      <div className="w-16 text-right">
        {saved ? (
          <span className="text-xs text-emerald-600">✓ Saved</span>
        ) : (
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="text-xs px-3 py-1 rounded-lg bg-[#8B7568] text-white
                       hover:bg-[#7a6659] disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            {saving ? '…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
