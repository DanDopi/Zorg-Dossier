import { getContrastingTextColor } from "@/lib/constants/colors"

interface CaregiverBadgeProps {
  name: string
  color?: string | null
  showName?: boolean
  size?: "sm" | "md" | "lg"
}

export function CaregiverBadge({
  name,
  color,
  showName = true,
  size = "md",
}: CaregiverBadgeProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const bgColor = color || "#9CA3AF"
  const textColor = getContrastingTextColor(bgColor)

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  }

  const nameSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold shadow-sm`}
        style={{ backgroundColor: bgColor, color: textColor }}
        title={name}
      >
        {initials}
      </div>
      {showName && <span className={nameSize[size]}>{name}</span>}
    </div>
  )
}
