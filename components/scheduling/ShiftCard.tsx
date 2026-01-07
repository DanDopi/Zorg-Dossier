import { getContrastingTextColor } from "@/lib/constants/colors"
import { AlertCircle, FileText, Edit } from "lucide-react"

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
  isPatternOverride: boolean
  shiftType: {
    id: string
    name: string
    color: string
  }
  caregiver?: {
    id: string
    name: string
    color?: string | null
    clientColorPreference?: string | null
  } | null
}

interface ShiftCardProps {
  shift: Shift
  onClick?: () => void
  isReadOnly?: boolean
  caregiverId?: string
}

export function ShiftCard({ shift, onClick, isReadOnly = false, caregiverId }: ShiftCardProps) {
  // Only use custom color when caregiver is viewing their own calendar
  const bgColor = caregiverId && shift.caregiver?.clientColorPreference
    ? shift.caregiver.clientColorPreference
    : (shift.shiftType?.color || shift.caregiver?.color || "#E5E7EB")
  const textColor = getContrastingTextColor(bgColor)
  const isUnfilled = !shift.caregiver

  const initials = shift.caregiver
    ? shift.caregiver.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : ""

  return (
    <div
      className={`
        relative rounded-lg p-3 text-sm shadow-sm transition-all cursor-pointer
        ${isUnfilled ? "border-2 border-dashed border-orange-400 bg-orange-50" : ""}
        ${!isReadOnly && "hover:shadow-md hover:scale-[1.02] hover:ring-2 hover:ring-blue-300"}
        ${shift.status === "COMPLETED" && "opacity-75"}
      `}
      style={{
        backgroundColor: isUnfilled ? undefined : bgColor,
        color: isUnfilled ? "#92400e" : textColor,
      }}
      onClick={onClick}
      title={isUnfilled ? "Klik om zorgverlener toe te wijzen" : `Klik om ${shift.caregiver?.name} aan te passen`}
    >
      {/* Pattern Override Indicator */}
      {shift.isPatternOverride && (
        <div
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center"
          title="Handmatig aangepast"
        >
          <Edit className="w-3 h-3" />
        </div>
      )}

      {/* Shift Type Name */}
      <div className="font-semibold mb-1 pr-6">{shift.shiftType.name}</div>

      {/* Time */}
      <div className="text-xs opacity-90 mb-2">
        {shift.startTime} - {shift.endTime}
      </div>

      {/* Caregiver or Unfilled */}
      <div className="flex items-center gap-2">
        {isUnfilled ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Niet ingevuld</span>
          </>
        ) : (
          <>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
              style={{
                backgroundColor: shift.caregiver?.color || "#9CA3AF",
                color: getContrastingTextColor(shift.caregiver?.color || "#9CA3AF"),
                borderColor: textColor,
              }}
            >
              {initials}
            </div>
            <span className="text-xs font-medium truncate">
              {shift.caregiver?.name}
            </span>
          </>
        )}
      </div>

      {/* Instruction Notes Indicator */}
      {shift.instructionNotes && (
        <div className="mt-2 flex items-center gap-1 text-xs opacity-75">
          <FileText className="w-3 h-3" />
          <span>Instructies</span>
        </div>
      )}

      {/* Status Badge */}
      {shift.status === "COMPLETED" && (
        <div className="absolute bottom-1 right-1 text-xs font-semibold opacity-75">
          ✓
        </div>
      )}
    </div>
  )
}
