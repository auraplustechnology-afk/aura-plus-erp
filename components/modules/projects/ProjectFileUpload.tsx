'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveProjectFile } from '@/lib/actions/projects'

interface ProjectFileUploadProps {
  projectId: string
  fileType: 'before' | 'after' | 'document'
  label?: string
}

export default function ProjectFileUpload({ projectId, fileType, label }: ProjectFileUploadProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const accept = fileType === 'document'
    ? '.pdf,.doc,.docx,.xls,.xlsx'
    : 'image/*'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError('')

    for (const file of Array.from(files)) {
      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Maximum 10MB.`)
        setUploading(false)
        return
      }

      const ext = file.name.split('.').pop()
      const path = `projects/${projectId}/${fileType}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

      const result = await saveProjectFile({
        project_id: projectId,
        file_type: fileType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
      })

      if (result.error) {
        setError(result.error)
        setUploading(false)
        return
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={fileType !== 'document'}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-xs text-red-500 mb-2">{error}</div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[#E2E8F0] dark:border-[#1E2A3B] rounded-lg text-sm text-slate-400 hover:border-[#0066FF]/40 hover:text-[#0066FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        ) : fileType === 'document' ? (
          <><Upload className="w-4 h-4" /> {label ?? 'Upload Document'}</>
        ) : (
          <><Camera className="w-4 h-4" /> {label ?? `Upload ${fileType} Photo`}</>
        )}
      </button>
    </div>
  )
}
