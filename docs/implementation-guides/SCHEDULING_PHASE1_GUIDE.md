# Scheduling System - Phase 1 Implementation Guide

This guide provides detailed instructions for completing Phase 1 of the scheduling system. All backend work (database, migrations, API routes) is already complete. This guide focuses on the remaining UI components.

## 📋 What's Already Done

✅ **Database Schema**
- Added `ShiftType`, `Shift`, `ShiftPattern`, `TimeOffRequest`, `SchedulingSettings` models
- Added `color` field to `CaregiverProfile`
- Added enums: `ShiftStatus`, `TimeOffType`, `RequestStatus`
- Migration applied successfully

✅ **API Routes**
- `/api/scheduling/shift-types` - Full CRUD for shift types
- `/api/scheduling/shifts` - Full CRUD for shifts
- `/api/scheduling/conflicts` - Conflict detection endpoint

✅ **Constants & Utilities**
- `lib/constants/colors.ts` - 20 preset caregiver colors
- Helper functions for color management

✅ **Navigation**
- Client menu: Added "Rooster" link
- Caregiver menu: Added "Mijn Rooster" link

---

## 🎯 Remaining Phase 1 Tasks

### 1. Shift Type Management UI (Client Only)
**File:** `app/dashboard/rooster/shift-types/page.tsx`

**Purpose:** Allow clients to create, edit, and delete shift types (e.g., "Early Shift", "Late Shift")

**Features:**
- Display list of existing shift types in cards
- Create new shift type form (name, start time, end time, color picker)
- Edit existing shift types
- Delete shift types (with validation - can't delete if in use)
- Color picker showing preset palette

**Component Structure:**
```tsx
// app/dashboard/rooster/shift-types/page.tsx (Server Component)
- Fetch user + client profile
- Pass to client component

// components/scheduling/ShiftTypeManagement.tsx (Client Component)
- State management for shift types
- CRUD operations via API
- Color picker component
- Form validation
```

**API Calls:**
```typescript
// GET shift types
const response = await fetch('/api/scheduling/shift-types')
const shiftTypes = await response.json()

// POST new shift type
await fetch('/api/scheduling/shift-types', {
  method: 'POST',
  body: JSON.stringify({
    name: "Early Shift",
    startTime: "06:00",
    endTime: "14:00",
    color: "#3B82F6"
  })
})

// PUT update
await fetch('/api/scheduling/shift-types', {
  method: 'PUT',
  body: JSON.stringify({ id, name, startTime, endTime, color })
})

// DELETE
await fetch(`/api/scheduling/shift-types?id=${id}`, {
  method: 'DELETE'
})
```

**UI Design:**
```
┌─────────────────────────────────────────────┐
│  Diensttypes Beheren                  [+ Nieuw] │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐       │
│  │ Early Shift  │  │ Late Shift   │       │
│  │ 06:00-14:00  │  │ 14:00-22:00  │       │
│  │ [Color: 🔵]  │  │ [Color: 🟢]  │       │
│  │ [Edit] [Del] │  │ [Edit] [Del] │       │
│  └──────────────┘  └──────────────┘       │
│                                             │
│  [Create Form - Hidden until + clicked]    │
│  ┌────────────────────────────────────┐   │
│  │ Naam: [____________]                │   │
│  │ Start: [06:00]  Eind: [14:00]      │   │
│  │ Kleur: [Color Picker Grid]         │   │
│  │ [Annuleren] [Opslaan]              │   │
│  └────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

### 2. Calendar Component (Week & Month Views)
**File:** `components/scheduling/ScheduleCalendar.tsx`

**Purpose:** Main calendar display showing shifts with assigned caregivers

**Features:**
- Toggle between week and month view
- Navigate previous/next week/month
- Display shifts with caregiver colors
- Show unfilled shifts in gray with warning
- Click shift to view/edit details
- Drag-drop caregiver assignment (advanced)

**Props:**
```typescript
interface ScheduleCalendarProps {
  clientId?: string      // For client view
  caregiverId?: string   // For caregiver view
  isReadOnly?: boolean   // true for caregivers
}
```

**State Management:**
```typescript
const [view, setView] = useState<'week' | 'month'>('week')
const [currentDate, setCurrentDate] = useState(new Date())
const [shifts, setShifts] = useState<Shift[]>([])
const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([])
```

**API Calls:**
```typescript
// Fetch shifts for date range
const startDate = getWeekStart(currentDate)
const endDate = getWeekEnd(currentDate)

const response = await fetch(
  `/api/scheduling/shifts?startDate=${startDate}&endDate=${endDate}&clientId=${clientId}`
)
const shifts = await response.json()
```

**Week View Layout:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  Ma 7/10 │  Di 8/10 │  Wo 9/10 │  Do 10/10│  Vr 11/10│  Za 12/10│  Zo 13/10│
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│          │          │          │          │          │          │          │
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │
│ │Early │ │ │Early │ │ │Early │ │ │Early │ │ │Early │ │ │Early │ │          │
│ │06-14 │ │ │06-14 │ │ │06-14 │ │ │06-14 │ │ │06-14 │ │ │06-14 │ │          │
│ │ JD   │ │ │ MS   │ │ │ JD   │ │ │⚠️    │ │ │ JD   │ │ │ MS   │ │          │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │          │
│          │          │          │          │          │          │          │
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │
│ │Late  │ │ │Late  │ │ │Late  │ │ │Late  │ │ │Late  │ │ │Late  │ │          │
│ │14-22 │ │ │14-22 │ │ │14-22 │ │ │14-22 │ │ │14-22 │ │ │14-22 │ │          │
│ │ PB   │ │ │ PB   │ │ │ MS   │ │ │ PB   │ │ │ MS   │ │ │⚠️    │ │          │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │          │
│          │          │          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Shift Card Component:**
```typescript
interface ShiftCardProps {
  shift: Shift
  onClick: () => void
  isReadOnly: boolean
}

function ShiftCard({ shift, onClick, isReadOnly }: ShiftCardProps) {
  const bgColor = shift.caregiver?.color || '#9CA3AF' // Gray for unfilled
  const textColor = getContrastingTextColor(bgColor)
  const initials = shift.caregiver
    ? getInitials(shift.caregiver.name)
    : '⚠️'

  return (
    <div
      className="shift-card cursor-pointer hover:shadow-lg"
      style={{ backgroundColor: bgColor, color: textColor }}
      onClick={onClick}
    >
      <div className="shift-type">{shift.shiftType.name}</div>
      <div className="shift-time">
        {shift.startTime}-{shift.endTime}
      </div>
      <div className="shift-caregiver">
        {initials}
      </div>
      {shift.instructionNotes && <div className="shift-note">📝</div>}
    </div>
  )
}
```

---

### 3. Shift Assignment Modal (Client Only)
**File:** `components/scheduling/ShiftAssignmentModal.tsx`

**Purpose:** Popup to assign/reassign caregivers to shifts with conflict warnings

**Features:**
- Select caregiver from dropdown (only ACTIVE relationships)
- Show current assignment
- Check conflicts before assigning
- Display conflict warning if detected
- Edit shift times
- Edit notes (internal + instruction)
- Save/Cancel buttons

**Props:**
```typescript
interface ShiftAssignmentModalProps {
  shift: Shift | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedShift: Shift) => void
  availableCaregivers: CaregiverProfile[]
}
```

**Conflict Detection Flow:**
```typescript
const checkConflicts = async (caregiverId: string) => {
  const response = await fetch('/api/scheduling/conflicts', {
    method: 'POST',
    body: JSON.stringify({
      caregiverId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      excludeShiftId: shift.id
    })
  })

  const result = await response.json()

  if (result.hasConflict) {
    setConflictWarning(
      `⚠️ Conflict: ${result.conflicts[0].clientName} - ${result.conflicts[0].shiftTypeName}`
    )
  }
}
```

**UI Layout:**
```
┌────────────────────────────────────────┐
│  Dienst Toewijzen                  [X] │
├────────────────────────────────────────┤
│                                        │
│  Datum: Maandag 7 oktober 2025        │
│  Diensttype: Early Shift              │
│  Tijd: 06:00 - 14:00                  │
│                                        │
│  Zorgverlener:                        │
│  [Dropdown: Jan de Vries ▼]           │
│                                        │
│  ⚠️ Waarschuwing: Deze zorgverlener   │
│     heeft al een dienst bij Client X  │
│     op dit tijdstip (08:00-16:00)     │
│     Wilt u toch toewijzen?            │
│                                        │
│  Interne notitie (alleen u):         │
│  [Text area]                          │
│                                        │
│  Dienst instructies (zichtbaar):     │
│  [Text area]                          │
│                                        │
│  [Annuleren]  [Opslaan]               │
└────────────────────────────────────────┘
```

---

### 4. Main Scheduling Page (Client View)
**File:** `app/dashboard/rooster/page.tsx`

**Purpose:** Main scheduling hub for clients

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Rooster Beheer                                     │
├─────────────────────────────────────────────────────┤
│  [Diensttypes] [Patronen] [Verlofaanvragen]       │  ← Tabs
├─────────────────────────────────────────────────────┤
│                                                     │
│  [< Vorige Week]  Week 41, 2025  [Volgende Week >]│
│  [Week View] [Maand View]                          │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │         [Calendar Component Here]            │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Legenda:                                          │
│  ⚠️ Niet ingevuld  ✓ Ingevuld  🔒 Voltooid       │
│                                                     │
│  [+ Nieuwe Dienst]  [Patronen Genereren]          │
└─────────────────────────────────────────────────────┘
```

**Server Component:**
```typescript
// app/dashboard/rooster/page.tsx
export default async function RoosterPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: {
        include: {
          caregiverRelationships: {
            where: { status: "ACTIVE" },
            include: {
              caregiver: true
            }
          }
        }
      }
    }
  })

  if (!user?.clientProfile || user.role !== "CLIENT") {
    redirect("/dashboard")
  }

  return <RoosterClient user={user} />
}
```

---

### 5. Caregiver Schedule View (Read-Only)
**File:** `app/dashboard/mijn-rooster/page.tsx`

**Purpose:** Show caregiver their assigned shifts across all clients

**Features:**
- Read-only calendar view
- Filter by client
- See shift instructions
- Request time-off button

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Mijn Rooster                                       │
├─────────────────────────────────────────────────────┤
│  Filter: [Alle Cliënten ▼]                         │
│  [< Vorige Week]  Week 41, 2025  [Volgende Week >]│
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │         [Calendar Component - Read Only]      │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Aankomende diensten:                              │
│  • Ma 7 okt - Early Shift (06:00-14:00) - Client A│
│  • Di 8 okt - Late Shift (14:00-22:00) - Client B │
│  • Wo 9 okt - Early Shift (06:00-14:00) - Client A│
│                                                     │
│  [Verlof Aanvragen]  [Ziekmelden]                 │
└─────────────────────────────────────────────────────┘
```

---

### 6. Caregiver Color Picker in Profile
**File:** Update `app/api/profile/route.ts` and profile UI

**Add to Profile Form:**
```tsx
import { CAREGIVER_COLORS } from '@/lib/constants/colors'

function CaregiverColorPicker({ currentColor, onChange }) {
  return (
    <div className="color-picker">
      <label>Uw kalenderkleur:</label>
      <div className="color-grid">
        {CAREGIVER_COLORS.map((color) => (
          <button
            key={color.hex}
            className={`color-option ${currentColor === color.hex ? 'selected' : ''}`}
            style={{ backgroundColor: color.hex }}
            onClick={() => onChange(color.hex)}
            title={color.name}
          >
            {currentColor === color.hex && '✓'}
          </button>
        ))}
      </div>
      <p>Huidige kleur: <span style={{ color: currentColor }}>●</span> {currentColor}</p>
    </div>
  )
}
```

**Update Profile API:**
```typescript
// app/api/profile/route.ts - Add to PUT handler
if (user.role === "CAREGIVER" && caregiverProfile) {
  // Allow color update
  if (color !== undefined) {
    await prisma.caregiverProfile.update({
      where: { id: caregiverProfile.id },
      data: { color }
    })
  }
}
```

---

### 7. Apply Caregiver Colors Site-Wide

**Locations to Update:**

1. **Team Page** (`components/dashboard/TeamClient.tsx`)
   - Show colored badge next to caregiver name
   - Use initials in colored circle

2. **Care Reports** (`components/dashboard/ReportsListClient.tsx`)
   - Show colored badge for report author

3. **Medication Logs** (`components/dashboard/MedicationManagementClient.tsx`)
   - Show colored badge for who administered

4. **I&O Records** (`components/dashboard/IORegistratieClient.tsx`)
   - Show colored badge for record creator

**Badge Component:**
```tsx
// components/ui/CaregiverBadge.tsx
interface CaregiverBadgeProps {
  name: string
  color?: string
  showName?: boolean
}

export function CaregiverBadge({ name, color, showName = true }: CaregiverBadgeProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const bgColor = color || '#9CA3AF'
  const textColor = getContrastingTextColor(bgColor)

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {initials}
      </div>
      {showName && <span>{name}</span>}
    </div>
  )
}
```

---

## 🧪 Testing Checklist

### Shift Types
- [ ] Create new shift type
- [ ] Edit existing shift type
- [ ] Delete unused shift type
- [ ] Try to delete shift type in use (should fail)
- [ ] Color picker works
- [ ] Time validation works (HH:mm format)

### Calendar
- [ ] Week view displays correctly
- [ ] Month view displays correctly
- [ ] Navigate previous/next week
- [ ] Shifts show correct caregiver colors
- [ ] Unfilled shifts show gray with warning
- [ ] Click shift opens modal

### Shift Assignment
- [ ] Assign caregiver to unfilled shift
- [ ] Reassign shift to different caregiver
- [ ] Conflict warning shows when overlap detected
- [ ] Can still save despite warning
- [ ] Internal notes save correctly
- [ ] Instruction notes save correctly
- [ ] Remove caregiver (set to unfilled)

### Caregiver View
- [ ] Caregiver sees only their shifts
- [ ] Calendar is read-only
- [ ] Can filter by client
- [ ] See instruction notes (not internal)

### Color System
- [ ] Caregiver can pick color in profile
- [ ] Color shows in calendar shifts
- [ ] Color shows in team list
- [ ] Color shows in reports/logs
- [ ] Initials display correctly

---

## 📦 Required npm Packages

You may need these additional packages:

```bash
# Date handling
npm install date-fns

# Drag and drop (optional, for advanced shift assignment)
npm install @dnd-kit/core @dnd-kit/sortable

# Color manipulation (if needed)
npm install tinycolor2
npm install --save-dev @types/tinycolor2
```

---

## 🎨 Styling Tips

### CSS for Calendar Grid
```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
}

.calendar-day {
  background: white;
  min-height: 150px;
  padding: 8px;
}

.shift-card {
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  transition: all 0.2s;
}

.shift-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

### Color Picker Grid
```css
.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: #000;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #000;
}
```

---

## 🚀 Implementation Order Recommendation

1. **Start with Shift Types Management** - Simplest, no dependencies
2. **Add Caregiver Color Picker** - Required for calendar display
3. **Build Calendar Component** - Core functionality
4. **Add Shift Assignment Modal** - Depends on calendar
5. **Create Main Scheduling Page** - Brings it all together
6. **Build Caregiver View** - Reuses calendar component
7. **Apply Colors Site-Wide** - Polish

---

## 📝 Notes

- All API endpoints are already created and tested
- Database schema is complete
- Focus on UI/UX and connecting to existing APIs
- Use existing UI components from `components/ui/` where possible
- Follow existing pattern: Server component fetches data, passes to Client component
- Use TypeScript interfaces for type safety
- Add proper error handling and loading states

---

## 🔗 Next Steps (Phase 2)

After Phase 1 is complete:
- Recurring patterns management
- Auto-generation of shifts from patterns
- Pattern override handling
- Bulk operations

After Phase 3:
- Time-off requests
- Sick leave with emergency notifications
- Email integration

---

## 💡 Tips for Success

1. **Build incrementally** - Test each component before moving to next
2. **Reuse components** - DRY principle
3. **Mobile responsive** - Test on different screen sizes
4. **Accessibility** - Add proper ARIA labels
5. **Error handling** - Show user-friendly messages
6. **Loading states** - Use skeleton loaders
7. **Optimistic updates** - Update UI before API confirms
8. **Confirmation dialogs** - For destructive actions

---

Good luck with implementation! If you need clarification on any component, refer back to the API documentation in the route files.
