"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import PdfDownloadDialog from "./PdfDownloadDialog"

interface ShiftType {
  id: string
  name: string
  color: string
}

interface PdfDownloadButtonProps {
  clientId: string
  shiftTypes: ShiftType[]
  clientName?: string
  caregiverId?: string
  currentDate?: Date
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function PdfDownloadButton({
  clientId,
  shiftTypes,
  clientName,
  caregiverId,
  currentDate,
  variant = "outline",
  size = "default",
}: PdfDownloadButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsDialogOpen(true)}
      >
        <FileDown className="mr-2 h-4 w-4" />
        Download PDF
      </Button>

      <PdfDownloadDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        clientId={clientId}
        shiftTypes={shiftTypes}
        clientName={clientName}
        caregiverId={caregiverId}
        currentDate={currentDate}
      />
    </>
  )
}
