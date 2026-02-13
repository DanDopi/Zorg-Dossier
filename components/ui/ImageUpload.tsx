"use client"

import React, { useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { compressImage } from "@/lib/imageCompression"

interface ImageUploadProps {
  label: string
  value: string | null
  onChange: (base64: string | null) => void
  maxFileSize: number
  disabled?: boolean
}

export function ImageUpload({ label, value, onChange, maxFileSize, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Selecteer een geldig afbeeldingsbestand (bijv. JPG, PNG)")
      return
    }

    if (file.size > maxFileSize) {
      const maxMB = (maxFileSize / (1024 * 1024)).toFixed(0)
      alert(`Afbeelding is te groot. Maximaal ${maxMB}MB toegestaan.`)
      return
    }

    setIsCompressing(true)
    try {
      const result = await compressImage(file)
      onChange(result.base64)
    } catch {
      alert("Kon afbeelding niet verwerken. Probeer een ander bestand.")
    } finally {
      setIsCompressing(false)
    }
  }

  function handleRemove() {
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isCompressing}
        className="hidden"
        aria-label={label}
      />
      {isCompressing ? (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
          <svg className="mx-auto h-8 w-8 text-blue-400 mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-blue-600">Afbeelding comprimeren...</p>
        </div>
      ) : !value ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <p className="text-sm text-gray-500">Klik om een foto te uploaden</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG — max {(maxFileSize / (1024 * 1024)).toFixed(0)}MB</p>
        </div>
      ) : (
        <div className="border rounded-lg p-3 space-y-3">
          <img
            src={value}
            alt={label}
            className="max-w-xs max-h-48 object-contain rounded"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Andere foto kiezen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Foto verwijderen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
