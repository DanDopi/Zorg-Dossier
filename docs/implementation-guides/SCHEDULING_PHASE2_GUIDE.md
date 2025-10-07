# Scheduling System - Phase 2 Implementation Guide

## Recurring Patterns & Auto-Generation

Phase 2 focuses on automating shift creation through recurring patterns. This eliminates the need to manually create shifts every week.

---

## 🎯 Phase 2 Goals

1. Create recurring shift patterns (e.g., "Jan works Monday early shift")
2. Auto-generate shifts from patterns for X weeks ahead
3. Handle pattern overrides (manual changes to individual shifts)
4. Regenerate patterns when settings change

---

## 📋 Required API Routes

### 1. Shift Patterns CRUD
**File:** `app/api/scheduling/patterns/route.ts`

```typescript
// GET /api/scheduling/patterns - Get all patterns for a client
export async function GET(request: NextRequest) {
  // Query params: clientId
  // Return all active patterns with relationships
}

// POST /api/scheduling/patterns - Create new pattern
export async function POST(request: NextRequest) {
  /*
    Body: {
      clientId: string
      caregiverId: string
      shiftTypeId: string
      dayOfWeek: number  // 0=Sunday, 1=Monday, etc.
      startDate: DateTime
      endDate?: DateTime  // Optional
    }
  */

  // Validate:
  // - Client owns shift type
  // - Caregiver has active relationship
  // - dayOfWeek is 0-6

  // Create pattern
  // Optionally trigger generation immediately
}

// PUT /api/scheduling/patterns - Update pattern
export async function PUT(request: NextRequest) {
  // Update pattern details
  // Ask user if they want to regenerate future shifts
}

// DELETE /api/scheduling/patterns?id=xxx - Delete pattern
export async function DELETE(request: NextRequest) {
  // Delete pattern
  // Optionally delete future shifts created by this pattern
}
```

---

### 2. Pattern Generation Endpoint
**File:** `app/api/scheduling/patterns/generate/route.ts`

```typescript
// POST /api/scheduling/patterns/generate - Generate shifts from patterns
export async function POST(request: NextRequest) {
  /*
    Body: {
      clientId: string
      weeksAhead?: number  // Optional override
      fromDate?: DateTime  // Start generating from this date (default: today)
    }
  */

  const session = await auth()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clientProfile: true }
  })

  if (!user?.clientProfile || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Get or create scheduling settings
  let settings = await prisma.schedulingSettings.findUnique({
    where: { clientId: user.clientProfile.id }
  })

  if (!settings) {
    settings = await prisma.schedulingSettings.create({
      data: {
        clientId: user.clientProfile.id,
        weeksAhead: 8
      }
    })
  }

  const weeksAhead = request.body.weeksAhead || settings.weeksAhead
  const fromDate = request.body.fromDate || new Date()

  // Get all active patterns
  const patterns = await prisma.shiftPattern.findMany({
    where: {
      clientId: user.clientProfile.id,
      isActive: true,
      startDate: { lte: addWeeks(fromDate, weeksAhead) },
      OR: [
        { endDate: null },
        { endDate: { gte: fromDate } }
      ]
    },
    include: {
      shiftType: true
    }
  })

  // Generate shifts for each pattern
  const shiftsToCreate: any[] = []
  const endDate = addWeeks(fromDate, weeksAhead)

  for (const pattern of patterns) {
    let currentDate = startOfWeek(fromDate)

    while (currentDate <= endDate) {
      // Find the next occurrence of pattern.dayOfWeek
      const targetDate = addDays(currentDate, (pattern.dayOfWeek - currentDate.getDay() + 7) % 7)

      if (targetDate >= pattern.startDate &&
          targetDate <= endDate &&
          (!pattern.endDate || targetDate <= pattern.endDate)) {

        // Check if shift already exists (avoid duplicates)
        const existingShift = await prisma.shift.findFirst({
          where: {
            clientId: pattern.clientId,
            date: startOfDay(targetDate),
            shiftTypeId: pattern.shiftTypeId,
            patternId: pattern.id
          }
        })

        if (!existingShift) {
          shiftsToCreate.push({
            clientId: pattern.clientId,
            shiftTypeId: pattern.shiftTypeId,
            date: startOfDay(targetDate),
            startTime: pattern.shiftType.startTime,
            endTime: pattern.shiftType.endTime,
            caregiverId: pattern.caregiverId,
            status: "FILLED",
            patternId: pattern.id,
            isPatternOverride: false,
            createdBy: session.user.id
          })
        }
      }

      currentDate = addWeeks(currentDate, 1)
    }
  }

  // Bulk create shifts
  const created = await prisma.shift.createMany({
    data: shiftsToCreate,
    skipDuplicates: true
  })

  // Update last generated timestamp
  await prisma.schedulingSettings.update({
    where: { clientId: user.clientProfile.id },
    data: { lastGenerated: new Date() }
  })

  return NextResponse.json({
    generated: created.count,
    message: `${created.count} diensten gegenereerd`
  })
}
```

---

### 3. Scheduling Settings Endpoint
**File:** `app/api/scheduling/settings/route.ts`

```typescript
// GET /api/scheduling/settings - Get client's scheduling settings
export async function GET(request: NextRequest) {
  const session = await auth()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clientProfile: true }
  })

  if (!user?.clientProfile) {
    return NextResponse.json({ error: "Not a client" }, { status: 403 })
  }

  let settings = await prisma.schedulingSettings.findUnique({
    where: { clientId: user.clientProfile.id }
  })

  if (!settings) {
    // Create default settings
    settings = await prisma.schedulingSettings.create({
      data: {
        clientId: user.clientProfile.id,
        weeksAhead: 8
      }
    })
  }

  return NextResponse.json(settings)
}

// PUT /api/scheduling/settings - Update settings
export async function PUT(request: NextRequest) {
  const session = await auth()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clientProfile: true }
  })

  if (!user?.clientProfile) {
    return NextResponse.json({ error: "Not a client" }, { status: 403 })
  }

  const body = await request.json()
  const { weeksAhead } = body

  if (weeksAhead < 1 || weeksAhead > 52) {
    return NextResponse.json(
      { error: "Weeks ahead must be between 1 and 52" },
      { status: 400 }
    )
  }

  const settings = await prisma.schedulingSettings.upsert({
    where: { clientId: user.clientProfile.id },
    update: { weeksAhead },
    create: {
      clientId: user.clientProfile.id,
      weeksAhead
    }
  })

  return NextResponse.json(settings)
}
```

---

## 🎨 UI Components

### 1. Pattern Management Page
**File:** `app/dashboard/rooster/patronen/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Terugkerende Patronen                     [+ Nieuw]│
├─────────────────────────────────────────────────────┤
│  Instellingen:                                      │
│  Genereer patronen voor: [8 ▼] weken vooruit       │
│  Laatste generatie: 7 okt 2025, 10:30              │
│  [Nu Genereren]                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Actieve Patronen:                                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔵 Jan de Vries                            │   │
│  │    Maandag - Early Shift (06:00-14:00)     │   │
│  │    Start: 1 jan 2025  Eind: -              │   │
│  │    [Bewerken] [Verwijderen]                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🟢 Maria Smit                              │   │
│  │    Dinsdag - Late Shift (14:00-22:00)      │   │
│  │    Start: 1 jan 2025  Eind: -              │   │
│  │    [Bewerken] [Verwijderen]                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔵 Jan de Vries                            │   │
│  │    Woensdag - Early Shift (06:00-14:00)    │   │
│  │    Start: 1 jan 2025  Eind: -              │   │
│  │    [Bewerken] [Verwijderen]                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Create Pattern Form:**
```
┌────────────────────────────────────────┐
│  Nieuw Patroon Toevoegen           [X] │
├────────────────────────────────────────┤
│                                        │
│  Zorgverlener:                        │
│  [Dropdown: Jan de Vries ▼]           │
│                                        │
│  Dag van de week:                     │
│  [Dropdown: Maandag ▼]                │
│                                        │
│  Diensttype:                          │
│  [Dropdown: Early Shift ▼]            │
│                                        │
│  Startdatum:                          │
│  [Date picker: 1 jan 2025]            │
│                                        │
│  Einddatum (optioneel):               │
│  [Date picker: ___________]           │
│  □ Geen einddatum                     │
│                                        │
│  □ Direct diensten genereren          │
│                                        │
│  [Annuleren]  [Opslaan]               │
└────────────────────────────────────────┘
```

---

### 2. Pattern Generation Component
**File:** `components/scheduling/PatternGenerator.tsx`

```typescript
interface PatternGeneratorProps {
  clientId: string
  onComplete: () => void
}

export function PatternGenerator({ clientId, onComplete }: PatternGeneratorProps) {
  const [weeksAhead, setWeeksAhead] = useState(8)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  const generateShifts = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/scheduling/patterns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, weeksAhead })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✓ ${result.generated} diensten gegenereerd!`)
        onComplete()
      } else {
        alert(`Fout: ${result.error}`)
      }
    } catch (error) {
      alert('Er is een fout opgetreden')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="pattern-generator">
      <h3>Diensten Genereren</h3>

      <div className="setting">
        <label>Genereer voor:</label>
        <select value={weeksAhead} onChange={e => setWeeksAhead(Number(e.target.value))}>
          {[1,2,4,8,12,26,52].map(w => (
            <option key={w} value={w}>{w} {w === 1 ? 'week' : 'weken'}</option>
          ))}
        </select>
      </div>

      {lastGenerated && (
        <p className="last-generated">
          Laatste generatie: {formatDateTime(lastGenerated)}
        </p>
      )}

      <button
        onClick={generateShifts}
        disabled={isGenerating}
        className="btn-primary"
      >
        {isGenerating ? 'Bezig...' : 'Nu Genereren'}
      </button>
    </div>
  )
}
```

---

### 3. Pattern Override Indicator

When a shift has been manually changed from its pattern, show indicator:

```typescript
function ShiftCard({ shift }: { shift: Shift }) {
  return (
    <div className="shift-card" style={{ backgroundColor: shift.caregiver?.color }}>
      {shift.isPatternOverride && (
        <span className="override-badge" title="Handmatig aangepast">
          ✏️
        </span>
      )}
      {/* Rest of shift card */}
    </div>
  )
}
```

---

## 🔄 Pattern Update Workflow

When editing an existing pattern:

```
┌────────────────────────────────────────┐
│  Patroon Bewerken                  [X] │
├────────────────────────────────────────┤
│  Dit patroon is actief met 45 diensten│
│  in de toekomst.                      │
│                                        │
│  [Current pattern fields...]          │
│                                        │
│  Wat wilt u doen?                     │
│  ○ Alleen dit patroon bijwerken       │
│     (bestaande diensten blijven)      │
│                                        │
│  ○ Patroon bijwerken en toekomstige   │
│     diensten opnieuw genereren        │
│     ⚠️ Dit overschrijft handmatige    │
│        aanpassingen!                  │
│                                        │
│  [Annuleren]  [Opslaan]               │
└────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Pattern Creation
- [ ] Create pattern for specific day of week
- [ ] Create pattern with end date
- [ ] Create pattern without end date
- [ ] Verify only ACTIVE caregivers shown in dropdown
- [ ] Auto-generate shifts immediately after creating pattern

### Pattern Generation
- [ ] Generate shifts for 1 week
- [ ] Generate shifts for 8 weeks
- [ ] Generate shifts for 52 weeks (1 year)
- [ ] Verify no duplicates created
- [ ] Verify correct caregivers assigned
- [ ] Verify shifts respect pattern start/end dates

### Pattern Updates
- [ ] Update pattern details
- [ ] Choose to regenerate future shifts
- [ ] Verify manual overrides are preserved (if selected)
- [ ] Delete pattern
- [ ] Optionally delete associated future shifts

### Edge Cases
- [ ] Pattern with caregiver on leave
- [ ] Overlapping patterns (same day, same shift type)
- [ ] Pattern starting in future
- [ ] Pattern ending in past
- [ ] Deactivate caregiver - what happens to patterns?

---

## 🎯 Automatic Pattern Generation (Cron Job)

For automatic generation, create a cron endpoint:

**File:** `app/api/cron/generate-shifts/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all clients with scheduling enabled
  const clients = await prisma.clientProfile.findMany({
    include: {
      schedulingSettings: true
    }
  })

  const results = []

  for (const client of clients) {
    if (!client.schedulingSettings) continue

    const { weeksAhead, lastGenerated } = client.schedulingSettings

    // Only generate if last generation was more than 7 days ago
    const daysSinceGeneration = lastGenerated
      ? differenceInDays(new Date(), lastGenerated)
      : 999

    if (daysSinceGeneration < 7) continue

    // Generate shifts for this client
    // [Same logic as manual generation endpoint]

    results.push({
      clientId: client.id,
      generated: created.count
    })
  }

  return NextResponse.json({ results })
}
```

**Setup Vercel Cron:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/generate-shifts",
    "schedule": "0 2 * * 0"  // Every Sunday at 2 AM
  }]
}
```

---

## 📝 Implementation Order

1. **Scheduling Settings API + UI** - Let client configure weeks ahead
2. **Pattern CRUD API** - Create/Read/Update/Delete patterns
3. **Pattern Management UI** - List patterns, create new, edit, delete
4. **Pattern Generation Logic** - Core algorithm
5. **Generation UI** - Button to trigger generation
6. **Pattern Override Handling** - Mark manual changes
7. **Auto-generation Cron** - Optional automation

---

## 🚀 Next Steps (Phase 3)

After Phase 2:
- Time-off request system
- Sick leave emergency flow
- Email notifications
- In-app alerts

---

## 💡 Advanced Features (Future)

- **Bulk pattern creation** - "Make this pattern for all Mondays, Wednesdays, Fridays"
- **Pattern templates** - Save common patterns for reuse
- **Pattern exceptions** - "Except holidays"
- **Smart scheduling** - AI suggests optimal patterns based on history
- **Conflict resolution** - Auto-find replacement for conflicts

---

Good luck with Phase 2! This is where the scheduling system becomes truly powerful and time-saving.
