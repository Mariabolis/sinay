import { useRef, useState } from 'react'
import { adminApi } from '../../api/admin'

interface Props {
  value: string       // current URL (controlled)
  onChange: (url: string) => void
}

export default function ImageUploader({ value, onChange }: Props) {
  const inputRef            = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [dragging,  setDragging]  = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const url = await adminApi.uploadImage(file)
      onChange(url)
    } catch {
      setError('Upload failed — check your Cloudinary credentials.')
    } finally {
      setUploading(false)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                    cursor-pointer transition-colors duration-200 select-none
                    ${dragging
                      ? 'border-mocha bg-mocha/8'
                      : 'border-mocha/25 hover:border-mocha/50 bg-[#F9F5F0]'}
                    ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        style={{ minHeight: value ? 120 : 88 }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 200 }}
            />
            {!uploading && (
              <span className="absolute bottom-2 right-2 bg-ink/60 text-cream text-[10px] px-2 py-1 rounded-full">
                Click to replace
              </span>
            )}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
                 strokeLinecap="round" className="w-6 h-6 text-mocha/40">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="text-[12px] text-mocha/50 text-center px-4">
              {uploading ? 'Uploading…' : 'Drop an image here, or click to browse'}
            </p>
          </>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream/70 rounded-xl">
            <div className="w-5 h-5 rounded-full border-2 border-mocha/30 border-t-mocha animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Manual URL fallback */}
      <input
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Or paste an image URL"
        className="w-full border border-mocha/20 rounded-lg px-3 py-2 text-[12px] font-body
                   text-ink placeholder:text-mocha/35 bg-white
                   focus:outline-none focus:border-mocha/50 transition-colors"
      />

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
