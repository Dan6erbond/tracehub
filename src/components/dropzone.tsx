import { Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { cn } from '#/lib/utils'
import type { Accept } from 'react-dropzone'

export function Dropzone({
  accept,
  multiple = true,
  disabled,
  invalid,
  label,
  hint,
  onFiles,
}: {
  accept?: Accept
  multiple?: boolean
  disabled?: boolean
  invalid?: boolean
  label: string
  hint?: string
  onFiles: (files: Array<File>) => void
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    disabled,
    onDrop: onFiles,
  })
  return (
    <div
      {...getRootProps()}
      aria-invalid={invalid}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-muted/30 px-6 py-8 text-center text-sm transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none aria-invalid:border-destructive',
        isDragActive && 'border-primary bg-primary/5',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input {...getInputProps()} />
      <Upload className="size-6 text-muted-foreground" />
      <p className="font-medium">
        {isDragActive ? 'Drop the files here' : label}
      </p>
      {hint && <p className="text-muted-foreground">{hint}</p>}
    </div>
  )
}
