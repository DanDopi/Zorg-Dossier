# Scheduling System - Phase 3 Implementation Guide

## Time-Off Requests & Sick Leave

Phase 3 implements the time-off request system, sick leave emergency flow, and notification system.

---

## 🎯 Phase 3 Goals

1. Caregivers can request time-off (vacation, day off)
2. Caregivers can call in sick (emergency notification)
3. Clients receive email + in-app alerts
4. Track request status (pending/approved/denied)
5. Reminder to call client when calling in sick

---

## 📋 Required API Routes

### 1. Time-Off Requests CRUD
**File:** `app/api/scheduling/time-off/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"  // You'll need to implement this

// GET /api/scheduling/time-off - Get time-off requests
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: true,
      caregiverProfile: true
    }
  })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const caregiverId = searchParams.get('caregiverId')
  const status = searchParams.get('status')

  // Build where clause based on user role
  const where: any = {}

  if (user?.role === "CLIENT" && user.clientProfile) {
    where.clientId = user.clientProfile.id
  } else if (user?.role === "CAREGIVER" && user.caregiverProfile) {
    where.caregiverId = user.caregiverProfile.id
  } else if (clientId) {
    where.clientId = clientId
  } else if (caregiverId) {
    where.caregiverId = caregiverId
  }

  if (status) {
    where.status = status
  }

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      caregiver: {
        include: {
          user: {
            select: { email: true }
          }
        }
      },
      client: {
        include: {
          user: {
            select: { email: true }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return NextResponse.json(requests)
}

// POST /api/scheduling/time-off - Create time-off request
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      caregiverProfile: {
        include: {
          user: true
        }
      }
    }
  })

  if (!user?.caregiverProfile || user.role !== "CAREGIVER") {
    return NextResponse.json(
      { error: "Only caregivers can request time off" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { clientId, requestType, startDate, endDate, reason } = body

  if (!clientId || !requestType || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Client, type, start and end date required" },
      { status: 400 }
    )
  }

  // Verify caregiver has relationship with this client
  const relationship = await prisma.caregiverClientRelationship.findFirst({
    where: {
      caregiverId: user.caregiverProfile.id,
      clientId,
      status: "ACTIVE"
    }
  })

  if (!relationship) {
    return NextResponse.json(
      { error: "No active relationship with this client" },
      { status: 400 }
    )
  }

  // Check if it's emergency (same day)
  const isEmergency = requestType === "SICK_LEAVE" &&
    new Date(startDate).toDateString() === new Date().toDateString()

  // Create request
  const timeOffRequest = await prisma.timeOffRequest.create({
    data: {
      caregiverId: user.caregiverProfile.id,
      clientId,
      requestType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "PENDING",
      isEmergency
    },
    include: {
      caregiver: {
        include: { user: true }
      },
      client: {
        include: { user: true }
      }
    }
  })

  // Send notification to client
  if (isEmergency) {
    // EMERGENCY sick leave - send urgent notification
    await sendEmergencySickLeaveNotification(timeOffRequest)
  } else {
    // Regular time-off request
    await sendTimeOffRequestNotification(timeOffRequest)
  }

  return NextResponse.json(timeOffRequest, { status: 201 })
}

// PUT /api/scheduling/time-off - Update request status (approve/deny)
export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clientProfile: true }
  })

  if (!user?.clientProfile || user.role !== "CLIENT") {
    return NextResponse.json(
      { error: "Only clients can approve/deny requests" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { id, status, reviewNotes } = body

  if (!id || !status) {
    return NextResponse.json(
      { error: "Request ID and status required" },
      { status: 400 }
    )
  }

  if (!["APPROVED", "DENIED"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be APPROVED or DENIED" },
      { status: 400 }
    )
  }

  // Verify ownership
  const existingRequest = await prisma.timeOffRequest.findUnique({
    where: { id }
  })

  if (!existingRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  if (existingRequest.clientId !== user.clientProfile.id) {
    return NextResponse.json(
      { error: "You don't have access to this request" },
      { status: 403 }
    )
  }

  // Update request
  const updatedRequest = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status,
      reviewNotes,
      reviewedBy: session.user.id,
      reviewedAt: new Date()
    },
    include: {
      caregiver: {
        include: { user: true }
      }
    }
  })

  // If approved, optionally unassign caregiver from shifts in that period
  if (status === "APPROVED") {
    // Find all shifts for this caregiver in the time-off period
    const affectedShifts = await prisma.shift.findMany({
      where: {
        caregiverId: existingRequest.caregiverId,
        clientId: existingRequest.clientId,
        date: {
          gte: existingRequest.startDate,
          lte: existingRequest.endDate
        },
        status: {
          not: "COMPLETED"
        }
      }
    })

    // Optionally auto-unassign (or let client do it manually)
    // For now, just notify client about affected shifts
  }

  // Send notification to caregiver
  await sendTimeOffResponseNotification(updatedRequest)

  return NextResponse.json(updatedRequest)
}

// DELETE /api/scheduling/time-off?id=xxx - Cancel request
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { caregiverProfile: true }
  })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: "Request ID required" }, { status: 400 })
  }

  const existingRequest = await prisma.timeOffRequest.findUnique({
    where: { id }
  })

  if (!existingRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  // Only caregiver who created it can delete (if still pending)
  if (user?.caregiverProfile?.id !== existingRequest.caregiverId) {
    return NextResponse.json(
      { error: "You can only cancel your own requests" },
      { status: 403 }
    )
  }

  if (existingRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Can only cancel pending requests" },
      { status: 400 }
    )
  }

  await prisma.timeOffRequest.delete({
    where: { id }
  })

  return NextResponse.json({ message: "Request cancelled" })
}
```

---

### 2. Email Notification Functions
**File:** `lib/email/notifications.ts`

```typescript
import { TimeOffRequest } from '@prisma/client'
import nodemailer from 'nodemailer'

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmergencySickLeaveNotification(request: any) {
  const clientEmail = request.client.user.email
  const caregiverName = request.caregiver.name

  const subject = `🚨 URGENT: ${caregiverName} heeft zich ziek gemeld`

  const html = `
    <h2>Dringende Ziekmelding</h2>
    <p><strong>${caregiverName}</strong> heeft zich ziek gemeld voor:</p>
    <ul>
      <li><strong>Datum:</strong> ${formatDate(request.startDate)} - ${formatDate(request.endDate)}</li>
      <li><strong>Reden:</strong> ${request.reason || 'Niet opgegeven'}</li>
    </ul>
    <p><strong>⚠️ Let op:</strong> De zorgverlener belt u ook om dit persoonlijk door te geven.</p>
    <p>Controleer uw rooster voor getroffen diensten en wijs een vervanger toe.</p>
    <p><a href="${process.env.NEXT_PUBLIC_URL}/dashboard/rooster">Ga naar Rooster</a></p>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: clientEmail,
    subject,
    html
  })
}

export async function sendTimeOffRequestNotification(request: any) {
  const clientEmail = request.client.user.email
  const caregiverName = request.caregiver.name

  const typeLabel = {
    DAY_OFF: 'Vrije dag',
    VACATION: 'Vakantie',
    SICK_LEAVE: 'Ziekteverlof'
  }[request.requestType]

  const subject = `Verlofaanvraag van ${caregiverName}`

  const html = `
    <h2>Nieuwe Verlofaanvraag</h2>
    <p><strong>${caregiverName}</strong> heeft verlof aangevraagd:</p>
    <ul>
      <li><strong>Type:</strong> ${typeLabel}</li>
      <li><strong>Periode:</strong> ${formatDate(request.startDate)} - ${formatDate(request.endDate)}</li>
      <li><strong>Reden:</strong> ${request.reason || 'Niet opgegeven'}</li>
    </ul>
    <p><a href="${process.env.NEXT_PUBLIC_URL}/dashboard/rooster/verlof">Aanvraag Beoordelen</a></p>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: clientEmail,
    subject,
    html
  })
}

export async function sendTimeOffResponseNotification(request: any) {
  const caregiverEmail = request.caregiver.user.email
  const clientName = request.client.name

  const statusLabel = request.status === 'APPROVED' ? 'goedgekeurd' : 'afgewezen'
  const subject = `Verlofaanvraag ${statusLabel}`

  const html = `
    <h2>Verlofaanvraag ${statusLabel}</h2>
    <p>Uw verlofaanvraag bij <strong>${clientName}</strong> is <strong>${statusLabel}</strong>.</p>
    <ul>
      <li><strong>Periode:</strong> ${formatDate(request.startDate)} - ${formatDate(request.endDate)}</li>
      ${request.reviewNotes ? `<li><strong>Opmerking:</strong> ${request.reviewNotes}</li>` : ''}
    </ul>
    <p><a href="${process.env.NEXT_PUBLIC_URL}/dashboard/mijn-rooster">Bekijk Rooster</a></p>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: caregiverEmail,
    subject,
    html
  })
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
```

---

### 3. In-App Notifications API
**File:** `app/api/notifications/route.ts`

```typescript
// Simple in-app notification system
// Store in database or use real-time service

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's unread notifications
  // For now, just check pending time-off requests

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: true,
      caregiverProfile: true
    }
  })

  let notifications = []

  if (user?.role === "CLIENT" && user.clientProfile) {
    // Check for pending time-off requests
    const pendingRequests = await prisma.timeOffRequest.findMany({
      where: {
        clientId: user.clientProfile.id,
        status: "PENDING"
      },
      include: {
        caregiver: true
      }
    })

    notifications = pendingRequests.map(req => ({
      id: req.id,
      type: req.isEmergency ? 'sick_leave' : 'time_off_request',
      message: req.isEmergency
        ? `🚨 ${req.caregiver.name} heeft zich ziek gemeld`
        : `${req.caregiver.name} heeft verlof aangevraagd`,
      link: `/dashboard/rooster/verlof`,
      createdAt: req.createdAt,
      isUrgent: req.isEmergency
    }))

    // Check for unfilled shifts in next 7 days
    const upcomingUnfilled = await prisma.shift.findMany({
      where: {
        clientId: user.clientProfile.id,
        status: "UNFILLED",
        date: {
          gte: new Date(),
          lte: addDays(new Date(), 7)
        }
      },
      include: {
        shiftType: true
      }
    })

    if (upcomingUnfilled.length > 0) {
      notifications.push({
        id: 'unfilled-shifts',
        type: 'unfilled_shifts',
        message: `⚠️ ${upcomingUnfilled.length} niet-ingevulde diensten in komende 7 dagen`,
        link: '/dashboard/rooster',
        createdAt: new Date(),
        isUrgent: true
      })
    }
  }

  if (user?.role === "CAREGIVER" && user.caregiverProfile) {
    // Check for upcoming shifts
    const upcomingShifts = await prisma.shift.findMany({
      where: {
        caregiverId: user.caregiverProfile.id,
        date: {
          gte: new Date(),
          lte: addDays(new Date(), 1)
        }
      },
      include: {
        shiftType: true,
        client: true
      },
      orderBy: {
        date: 'asc'
      },
      take: 3
    })

    notifications = upcomingShifts.map(shift => ({
      id: shift.id,
      type: 'upcoming_shift',
      message: `Dienst morgen: ${shift.shiftType.name} bij ${shift.client.name}`,
      link: '/dashboard/mijn-rooster',
      createdAt: shift.date,
      isUrgent: false
    }))
  }

  return NextResponse.json({ notifications })
}
```

---

## 🎨 UI Components

### 1. Time-Off Request Form (Caregiver)
**File:** `components/scheduling/TimeOffRequestForm.tsx`

```tsx
interface TimeOffRequestFormProps {
  caregiverId: string
  clients: { id: string; name: string }[]
  onSubmit: () => void
}

export function TimeOffRequestForm({ caregiverId, clients, onSubmit }: TimeOffRequestFormProps) {
  const [requestType, setRequestType] = useState<'DAY_OFF' | 'SICK_LEAVE' | 'VACATION'>('DAY_OFF')
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [showSickWarning, setShowSickWarning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (requestType === 'SICK_LEAVE') {
      setShowSickWarning(true)
      return
    }

    await submitRequest()
  }

  const confirmSickLeave = async () => {
    await submitRequest()
  }

  const submitRequest = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/scheduling/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          requestType,
          startDate,
          endDate,
          reason
        })
      })

      if (response.ok) {
        alert('✓ Aanvraag verstuurd!')
        onSubmit()
      } else {
        const error = await response.json()
        alert(`Fout: ${error.error}`)
      }
    } catch (error) {
      alert('Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
      setShowSickWarning(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="time-off-form">
        <h3>Verlof Aanvragen</h3>

        <div className="form-group">
          <label>Cliënt:</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} required>
            <option value="">Selecteer cliënt...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Type:</label>
          <select value={requestType} onChange={e => setRequestType(e.target.value as any)} required>
            <option value="DAY_OFF">Vrije dag</option>
            <option value="VACATION">Vakantie</option>
            <option value="SICK_LEAVE">Ziekmelding</option>
          </select>
        </div>

        <div className="form-group">
          <label>Van:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Tot:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={startDate}
            required
          />
        </div>

        <div className="form-group">
          <label>Reden (optioneel):</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Bezig...' : 'Aanvragen'}
        </button>
      </form>

      {/* Sick Leave Warning Dialog */}
      {showSickWarning && (
        <div className="modal-overlay">
          <div className="modal sick-warning">
            <h3>⚠️ Ziekmelding</h3>
            <p>
              <strong>Belangrijk:</strong> Bel uw cliënt ook persoonlijk om uw ziekmelding door te geven!
            </p>
            <p>
              Een e-mail wordt automatisch verstuurd, maar een persoonlijk telefoontje is vereist.
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowSickWarning(false)}>
                Annuleren
              </button>
              <button onClick={confirmSickLeave} className="btn-primary">
                Begrepen, verstuur melding
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

---

### 2. Time-Off Request List (Client)
**File:** `components/scheduling/TimeOffRequestList.tsx`

```tsx
export function TimeOffRequestList({ clientId }: { clientId: string }) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending')

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    const statusParam = filter === 'all' ? '' : `&status=${filter.toUpperCase()}`
    const response = await fetch(`/api/scheduling/time-off?clientId=${clientId}${statusParam}`)
    const data = await response.json()
    setRequests(data)
  }

  const handleApprove = async (requestId: string, notes?: string) => {
    await fetch('/api/scheduling/time-off', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestId,
        status: 'APPROVED',
        reviewNotes: notes
      })
    })
    fetchRequests()
  }

  const handleDeny = async (requestId: string, notes?: string) => {
    await fetch('/api/scheduling/time-off', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestId,
        status: 'DENIED',
        reviewNotes: notes
      })
    })
    fetchRequests()
  }

  return (
    <div className="time-off-list">
      <div className="filter-tabs">
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          In behandeling ({requests.filter(r => r.status === 'PENDING').length})
        </button>
        <button
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Goedgekeurd
        </button>
        <button
          className={filter === 'denied' ? 'active' : ''}
          onClick={() => setFilter('denied')}
        >
          Afgewezen
        </button>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Alles
        </button>
      </div>

      <div className="requests">
        {requests.map(request => (
          <TimeOffRequestCard
            key={request.id}
            request={request}
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        ))}
      </div>
    </div>
  )
}

function TimeOffRequestCard({ request, onApprove, onDeny }) {
  const [notes, setNotes] = useState('')
  const [showReview, setShowReview] = useState(false)

  return (
    <div className={`request-card ${request.isEmergency ? 'emergency' : ''}`}>
      {request.isEmergency && <span className="emergency-badge">🚨 URGENT</span>}

      <div className="request-header">
        <h4>{request.caregiver.name}</h4>
        <span className="request-type">{getTypeLabel(request.requestType)}</span>
      </div>

      <div className="request-dates">
        {formatDate(request.startDate)} - {formatDate(request.endDate)}
      </div>

      {request.reason && (
        <div className="request-reason">
          <strong>Reden:</strong> {request.reason}
        </div>
      )}

      {request.status === 'PENDING' && (
        <div className="request-actions">
          <button onClick={() => setShowReview(true)}>Beoordelen</button>
        </div>
      )}

      {request.status !== 'PENDING' && (
        <div className={`request-status ${request.status.toLowerCase()}`}>
          {request.status === 'APPROVED' ? '✓ Goedgekeurd' : '✗ Afgewezen'}
          {request.reviewNotes && <p>{request.reviewNotes}</p>}
        </div>
      )}

      {showReview && (
        <div className="review-panel">
          <textarea
            placeholder="Opmerking (optioneel)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="review-actions">
            <button onClick={() => setShowReview(false)}>Annuleren</button>
            <button
              onClick={() => {
                onDeny(request.id, notes)
                setShowReview(false)
              }}
              className="btn-deny"
            >
              Afwijzen
            </button>
            <button
              onClick={() => {
                onApprove(request.id, notes)
                setShowReview(false)
              }}
              className="btn-approve"
            >
              Goedkeuren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 3. Notification Bell Component
**File:** `components/ui/NotificationBell.tsx`

```tsx
export function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications')
    const data = await response.json()
    setNotifications(data.notifications)
    setUnreadCount(data.notifications.filter(n => n.isUrgent).length)
  }

  return (
    <div className="notification-bell">
      <button onClick={() => setShowDropdown(!showDropdown)}>
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <h4>Meldingen</h4>
          {notifications.length === 0 ? (
            <p>Geen nieuwe meldingen</p>
          ) : (
            notifications.map(notif => (
              <a
                key={notif.id}
                href={notif.link}
                className={`notification-item ${notif.isUrgent ? 'urgent' : ''}`}
              >
                <p>{notif.message}</p>
                <span className="time">{formatTimeAgo(notif.createdAt)}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 🧪 Testing Checklist

### Time-Off Requests
- [ ] Caregiver requests day off
- [ ] Caregiver requests vacation (multiple days)
- [ ] Caregiver calls in sick (same day)
- [ ] Sick leave shows warning dialog
- [ ] Client receives email notification
- [ ] Client sees in-app notification

### Request Management
- [ ] Client approves request
- [ ] Client denies request
- [ ] Caregiver receives response email
- [ ] Approved request affects shift availability
- [ ] Caregiver can cancel pending request
- [ ] Can't cancel approved/denied request

### Emergency Sick Leave
- [ ] Emergency flag set correctly
- [ ] Urgent email sent
- [ ] Shows urgent badge in UI
- [ ] Warning message displayed to caregiver

---

## 📝 Environment Variables Required

Add to `.env`:
```
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Zorgdossier <noreply@zorgdossier.com>"

# App URL
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## 🚀 Implementation Order

1. **Time-Off API routes** - Backend first
2. **Email notification system** - Set up nodemailer
3. **Time-Off request form** - Caregiver creates requests
4. **Time-Off list** - Client reviews requests
5. **In-app notifications** - Real-time alerts
6. **Notification bell** - UI indicator
7. **Integration with calendar** - Show approved time-off

---

## 💡 Future Enhancements

- **Push notifications** - Mobile app alerts
- **SMS notifications** - Text message for emergencies
- **Auto-responders** - "Out of office" messages
- **Shift swap** - Caregivers trade shifts
- **On-call system** - Emergency contact list
- **Shift marketplace** - Offer shifts to other caregivers

---

This completes Phase 3! You now have a full-featured time-off and sick leave system with email notifications.
