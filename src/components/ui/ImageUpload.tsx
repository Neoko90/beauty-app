'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Camera, Loader2, X } from 'lucide-react'

interface ImageUploadProps {
  currentUrl?: string | null
  onUpload: (url: string) => void
  bucket?: string
  folder?: string
  size?: 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'square'
  placeholder?: string
}

export function ImageUpload({
  currentUrl,
  onUpload,
  bucket = 'avatars',
  folder = 'staff',
  size = 'md',
  shape = 'circle',
  placeholder,
}: ImageUploadProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Walidacja
    if (!file.type.startsWith('image/')) {
      setError('Tylko pliki graficzne (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maks. 5 MB')
      return
    }

    setError(null)
    setUploading(true)

    // Podgląd
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    try {
      // Kompresja przez canvas (maks 800px, jakość 0.85)
      const compressed = await compressImage(file, 800, 0.85)

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, compressed, { upsert: true })

      if (uploadError) {
        // Jeśli bucket nie istnieje - pokaż pomocny błąd
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
          setError('Utwórz bucket "' + bucket + '" w Supabase Storage')
        } else {
          setError(uploadError.message)
        }
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      onUpload(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Błąd uploadu')
    }

    setUploading(false)
  }

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onUpload('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'relative cursor-pointer group',
          sizes[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          'overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 hover:border-violet-400 transition-colors'
        )}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {/* Remove button */}
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            {uploading
              ? <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
              : <Camera className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" />
            }
            {placeholder && !uploading && (
              <span className="text-[10px] text-gray-400 text-center px-1 leading-tight">{placeholder}</span>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />

      {error && <p className="text-xs text-red-500 text-center max-w-[120px]">{error}</p>}
      {!error && <p className="text-xs text-gray-400">Kliknij aby {preview ? 'zmienić' : 'dodać'}</p>}
    </div>
  )
}

// Kompresja obrazu przez canvas
async function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim }
        else { width = Math.round((width * maxDim) / height); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality)
    }
    img.src = url
  })
}
