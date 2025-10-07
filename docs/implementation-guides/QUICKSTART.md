# Scheduling System - Quick Start Guide

Get up and running with the scheduling system in 30 minutes!

---

## 🚀 Quick Setup (5 minutes)

### 1. Verify Database Migration
```bash
# Check if migration was applied
npx prisma studio
# Look for: ShiftType, Shift, ShiftPattern, TimeOffRequest, SchedulingSettings tables
```

✅ If you see these tables, migration is complete!

### 2. Install Dependencies (if needed)
```bash
npm install date-fns
# Optional for Phase 3:
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 3. Verify API Routes
```bash
# Start dev server
npm run dev

# Test API endpoints (use Postman or curl)
curl http://localhost:3000/api/scheduling/shift-types
# Should return [] or require auth
```

✅ If you get JSON response (not 404), routes are working!

---

## 📝 Hello World - Create Your First Shift Type (10 minutes)

Let's create a minimal working example to verify everything works.

### Step 1: Create Test Page
**File:** `app/test-scheduling/page.tsx`

```tsx
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import TestSchedulingClient from "./TestSchedulingClient"

export default async function TestSchedulingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clientProfile: true }
  })

  if (!user?.clientProfile) {
    return <div>This test is only for CLIENT users</div>
  }

  const shiftTypes = await prisma.shiftType.findMany({
    where: { clientId: user.clientProfile.id }
  })

  return <TestSchedulingClient clientId={user.clientProfile.id} shiftTypes={shiftTypes} />
}
```

### Step 2: Create Client Component
**File:** `app/test-scheduling/TestSchedulingClient.tsx`

```tsx
"use client"

import { useState } from "react"

export default function TestSchedulingClient({ clientId, shiftTypes: initialShiftTypes }) {
  const [shiftTypes, setShiftTypes] = useState(initialShiftTypes)
  const [name, setName] = useState("")
  const [startTime, setStartTime] = useState("06:00")
  const [endTime, setEndTime] = useState("14:00")
  const [color, setColor] = useState("#3B82F6")

  const createShiftType = async (e: React.FormEvent) => {
    e.preventDefault()

    const response = await fetch('/api/scheduling/shift-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startTime, endTime, color })
    })

    if (response.ok) {
      const newShiftType = await response.json()
      setShiftTypes([...shiftTypes, newShiftType])
      setName("")
      alert("✅ Shift type created!")
    } else {
      const error = await response.json()
      alert(`❌ Error: ${error.error}`)
    }
  }

  const deleteShiftType = async (id: string) => {
    if (!confirm("Delete this shift type?")) return

    const response = await fetch(`/api/scheduling/shift-types?id=${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      setShiftTypes(shiftTypes.filter(st => st.id !== id))
      alert("✅ Deleted!")
    } else {
      const error = await response.json()
      alert(`❌ Error: ${error.error}`)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Scheduling System Test</h1>

      <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>Create Shift Type</h2>
        <form onSubmit={createShiftType}>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Name:
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Early Shift"
                required
                style={{ marginLeft: '1rem', padding: '0.5rem' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Start:
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                style={{ marginLeft: '1rem', padding: '0.5rem' }}
              />
            </label>
            <label style={{ marginLeft: '1rem' }}>
              End:
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                style={{ marginLeft: '1rem', padding: '0.5rem' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Color:
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ marginLeft: '1rem' }}
              />
            </label>
          </div>
          <button type="submit" style={{ padding: '0.5rem 1rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Create Shift Type
          </button>
        </form>
      </div>

      <div>
        <h2>Existing Shift Types ({shiftTypes.length})</h2>
        {shiftTypes.length === 0 ? (
          <p>No shift types yet. Create one above!</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {shiftTypes.map(st => (
              <div
                key={st.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{st.name}</h3>
                    <p style={{ margin: '0.5rem 0', color: '#666' }}>
                      {st.startTime} - {st.endTime}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          background: st.color,
                          borderRadius: '4px',
                          border: '1px solid #ddd'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#666' }}>{st.color}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteShiftType(st.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
        <h3>✅ Test Checklist</h3>
        <ul>
          <li>Create a shift type ✓</li>
          <li>View it in the list ✓</li>
          <li>Delete it ✓</li>
          <li>Check Prisma Studio to verify data persistence</li>
        </ul>
        <p><strong>If all tests pass, your backend is working perfectly!</strong></p>
      </div>
    </div>
  )
}
```

### Step 3: Test It!

1. **Log in as a CLIENT user**
2. **Navigate to:** `http://localhost:3000/test-scheduling`
3. **Create a shift type** (e.g., "Early Shift", 06:00-14:00)
4. **Verify it appears** in the list
5. **Delete it**
6. **Open Prisma Studio** and check `ShiftType` table

```bash
npx prisma studio
# Navigate to ShiftType table
# Should see your created entries
```

✅ **If this works, your API and database are perfect!**

---

## 🎨 Test Caregiver Colors (5 minutes)

### Add Color Picker to Profile Page

Find your caregiver profile page and add this:

```tsx
import { CAREGIVER_COLORS } from '@/lib/constants/colors'

// In your component:
const [selectedColor, setSelectedColor] = useState(caregiver.color || CAREGIVER_COLORS[0].hex)

// In your form:
<div className="color-picker">
  <label>Your Calendar Color:</label>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
    {CAREGIVER_COLORS.map(color => (
      <button
        key={color.hex}
        type="button"
        onClick={() => setSelectedColor(color.hex)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: color.hex,
          border: selectedColor === color.hex ? '3px solid black' : '1px solid #ddd',
          cursor: 'pointer'
        }}
        title={color.name}
      />
    ))}
  </div>
</div>

// Update your save handler to include color
```

---

## 🎯 Next Steps - Build Real Features (10 minutes planning)

Now that you've verified everything works, choose your path:

### Path A: Visual First (Recommended)
1. Build the calendar component
2. Add shift cards
3. Make it look good
4. Then add functionality

**Why?** You get visual feedback immediately, making development more enjoyable.

### Path B: Feature Complete
1. Build shift type management (complete)
2. Build shift management (complete)
3. Build calendar (integrate everything)
4. Add patterns (automation)

**Why?** Systematic approach, each feature fully working before moving on.

### Path C: MVP Speed Run
1. Hardcode some shift types
2. Build minimal calendar (just show data)
3. Add basic assignment
4. Polish later

**Why?** Get something usable FAST, iterate based on feedback.

---

## 📚 Key Files Reference

### When implementing, you'll frequently reference:

1. **API Routes** (already built):
   - `app/api/scheduling/shift-types/route.ts`
   - `app/api/scheduling/shifts/route.ts`
   - `app/api/scheduling/conflicts/route.ts`

2. **Constants**:
   - `lib/constants/colors.ts`

3. **Prisma Client**:
   - `lib/prisma.ts`

4. **Types** (auto-generated):
   - `node_modules/.prisma/client/index.d.ts`

---

## 💡 Pro Tips

### 1. Use Prisma Studio for Debugging
```bash
npx prisma studio
```
Visual database browser - see data in real-time!

### 2. Test API with curl
```bash
# Create shift type (replace with your auth token)
curl -X POST http://localhost:3000/api/scheduling/shift-types \
  -H "Content-Type: application/json" \
  -d '{"name":"Early Shift","startTime":"06:00","endTime":"14:00","color":"#3B82F6"}'
```

### 3. Use React DevTools
Install React DevTools browser extension to inspect component state

### 4. Console.log is your friend
```typescript
console.log('Shifts:', shifts)
console.log('Selected date:', selectedDate)
```

### 5. Start Simple
Don't try to build the perfect calendar on day 1. Start with a simple list, then improve.

---

## 🐛 Troubleshooting

### "Unauthorized" error
- Make sure you're logged in
- Check your session is valid
- Verify user role (CLIENT vs CAREGIVER)

### "Client ID required"
- Check you have a ClientProfile created
- Verify user.clientProfile is populated

### "Shift type not found"
- Create a shift type first
- Check the ID is correct

### Data not persisting
- Check database connection (DATABASE_URL)
- Verify migration ran successfully
- Look for errors in console

### Colors not working
- Import from `@/lib/constants/colors`
- Check caregiver has color field set
- Verify color is valid hex code

---

## ✨ You're Ready!

You now have:
- ✅ Working backend
- ✅ Test page to verify functionality
- ✅ Understanding of the system
- ✅ Clear next steps

**Start with [Phase 1 Guide](./SCHEDULING_PHASE1_GUIDE.md) to build production UI!**

---

## 🎉 Success Metrics

After Phase 1, you should have:
- 📅 Visual calendar showing shifts
- 🎨 Color-coded caregivers
- ➕ Ability to create/assign shifts
- ⚠️ Conflict warnings
- 🖱️ Click-to-edit functionality

**Estimated time to Phase 1 completion:** 2-3 days for experienced developer

Good luck! 🚀
