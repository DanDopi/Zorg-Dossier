# Scheduling System - Complete Overview

## 📚 Documentation Guide

This folder contains comprehensive implementation guides for the complete scheduling system. Start here to understand what's been built and what remains to be implemented.

---

## ✅ What's Already Complete

### Database Schema
- **5 new models** added to Prisma schema:
  - `ShiftType` - Shift templates (e.g., "Early Shift" 06:00-14:00)
  - `Shift` - Individual shift instances
  - `ShiftPattern` - Recurring patterns (e.g., "Jan works Monday early shift")
  - `TimeOffRequest` - Time-off and sick leave requests
  - `SchedulingSettings` - Client-specific scheduling configuration

- **3 new enums**:
  - `ShiftStatus` - UNFILLED, FILLED, CANCELLED, COMPLETED
  - `TimeOffType` - DAY_OFF, SICK_LEAVE, VACATION
  - `RequestStatus` - PENDING, APPROVED, DENIED

- **Caregiver color field** added to `CaregiverProfile` model

- **Database migration** applied successfully ✅

### API Routes (Backend Complete)
All API routes are fully implemented and ready to use:

1. **`/api/scheduling/shift-types`** - CRUD for shift types
   - GET - List all shift types for a client
   - POST - Create new shift type
   - PUT - Update shift type
   - DELETE - Delete shift type (validates not in use)

2. **`/api/scheduling/shifts`** - CRUD for shifts
   - GET - Get shifts for date range (with filters)
   - POST - Create new shift
   - PUT - Update shift (assign caregiver, edit notes)
   - DELETE - Delete shift

3. **`/api/scheduling/conflicts`** - Conflict detection
   - POST - Check if caregiver has conflicting shifts

### Utilities & Constants
- **`lib/constants/colors.ts`** - 20 preset caregiver colors
  - Color picker palette
  - Helper functions for color management
  - Contrast calculation for text readability

### Navigation
- Client menu: "Rooster" link added
- Caregiver menu: "Mijn Rooster" link added

---

## 📋 Implementation Phases

### Phase 1: Basic Scheduling UI
**Status:** 🟡 Ready to implement (Backend complete, UI guides ready)

**What you'll build:**
1. Shift type management page
2. Calendar component (week & month views)
3. Shift assignment modal with conflict warnings
4. Caregiver color picker in profile
5. Apply colors site-wide (badges in reports, medication logs, etc.)

**Estimated time:** 2-3 days for experienced developer

**Guide:** [SCHEDULING_PHASE1_GUIDE.md](./SCHEDULING_PHASE1_GUIDE.md)

---

### Phase 2: Recurring Patterns & Auto-Generation
**Status:** 🔴 Not started (API + UI both need implementation)

**What you'll build:**
1. Pattern CRUD API routes
2. Pattern generation algorithm
3. Scheduling settings API
4. Pattern management UI
5. Auto-generate shifts from patterns
6. Pattern override handling

**Estimated time:** 2-3 days

**Guide:** [SCHEDULING_PHASE2_GUIDE.md](./SCHEDULING_PHASE2_GUIDE.md)

---

### Phase 3: Time-Off & Sick Leave
**Status:** 🔴 Not started (API + UI both need implementation)

**What you'll build:**
1. Time-off request API routes
2. Email notification system (nodemailer)
3. In-app notification system
4. Time-off request form (caregiver)
5. Time-off approval UI (client)
6. Sick leave emergency flow

**Estimated time:** 2 days

**Guide:** [SCHEDULING_PHASE3_GUIDE.md](./SCHEDULING_PHASE3_GUIDE.md)

---

## 🏗️ System Architecture

### Data Flow

```
┌─────────────────────────────────────────────────┐
│                   CLIENT                        │
│  1. Creates shift types (Early, Late, Night)   │
│  2. Creates recurring patterns                  │
│     "Jan works Monday early shift"              │
│  3. System auto-generates shifts                │
│  4. Client reviews/assigns shifts               │
│  5. Caregiver requests time-off                 │
│  6. Client approves/denies                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              CAREGIVER                          │
│  1. Sees assigned shifts in calendar            │
│  2. Can request time-off                        │
│  3. Can call in sick (emergency)                │
│  4. Receives notifications                      │
└─────────────────────────────────────────────────┘
```

### Database Relationships

```
ClientProfile
  ├─ ShiftType[] (one-to-many)
  │   └─ Shift[] (one-to-many)
  │   └─ ShiftPattern[] (one-to-many)
  │
  ├─ SchedulingSettings (one-to-one)
  └─ TimeOffRequest[] (one-to-many)

CaregiverProfile
  ├─ color (string - hex color)
  ├─ Shift[] (one-to-many, nullable)
  ├─ ShiftPattern[] (one-to-many)
  └─ TimeOffRequest[] (one-to-many)

Shift
  ├─ belongs to ClientProfile
  ├─ belongs to ShiftType
  ├─ optionally assigned to CaregiverProfile
  └─ optionally linked to ShiftPattern (patternId)
```

---

## 🎯 Core Features Breakdown

### 1. Shift Types (Client Configuration)
- Name (e.g., "Early Shift")
- Start time (HH:mm format)
- End time (HH:mm format)
- Color (for visual distinction in shift type)
- **Used as templates** for creating shifts

### 2. Shifts (Individual Instances)
- Date + time
- Assigned to shift type
- Optionally assigned to caregiver (or UNFILLED)
- Status: UNFILLED → FILLED → COMPLETED
- Two note fields:
  - Internal notes (client-only)
  - Instruction notes (visible to caregiver)
- Pattern tracking (if auto-generated)

### 3. Recurring Patterns
- Define: "Caregiver X works Shift Type Y on Day Z"
- Auto-generates shifts for configured weeks ahead
- Supports end dates for temporary patterns
- Manual overrides tracked (isPatternOverride flag)

### 4. Conflict Detection
- Warns when assigning caregiver who already has shift
- Checks across all clients (caregivers work for multiple clients)
- Time range overlap detection
- **Allows override** (warning only, not blocking)

### 5. Caregiver Colors
- Each caregiver picks from 20 preset colors
- Used throughout app for quick visual identification:
  - Scheduling calendar (primary use)
  - Team list
  - Care reports
  - Medication logs
  - I&O records
- Initials displayed in colored circles
- Auto-contrast text color (black/white based on background)

### 6. Time-Off System
- Three types: Day Off, Vacation, Sick Leave
- Status workflow: PENDING → APPROVED/DENIED
- Emergency sick leave detection (same-day)
- Email + in-app notifications
- Reminder to call client for sick leave

---

## 🔧 Technical Stack

### Backend
- **Next.js 14** - App Router
- **Prisma** - ORM
- **PostgreSQL** - Database
- **NextAuth** - Authentication
- **Nodemailer** - Email notifications (Phase 3)

### Frontend
- **React 18** - Server + Client Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **date-fns** - Date manipulation

### APIs
- RESTful API routes in Next.js
- JWT authentication via NextAuth
- Role-based access control (CLIENT, CAREGIVER, ADMIN)

---

## 📊 User Roles & Permissions

### CLIENT
✅ Can:
- Create/edit/delete shift types
- Create/edit/delete shifts
- Assign caregivers to shifts
- Create/edit/delete recurring patterns
- Generate shifts from patterns
- Configure scheduling settings (weeks ahead)
- Approve/deny time-off requests
- View all notifications

❌ Cannot:
- Edit another client's shifts
- Assign caregivers without active relationship

### CAREGIVER
✅ Can:
- View personal schedule (assigned shifts)
- View shift instruction notes
- Request time-off
- Call in sick
- Choose profile color

❌ Cannot:
- Create/edit shifts
- Create patterns
- Assign themselves to shifts
- View internal notes

### ADMIN/SUPER_ADMIN
✅ Can:
- View all clients' schedules
- Assist with troubleshooting
- Manage users

---

## 🎨 Design Principles

### Color System
- **Caregiver colors** = Primary identification
- **Shift type colors** = Secondary (shown as text/badge)
- **Status colors**:
  - Gray = Unfilled
  - Caregiver color = Filled
  - Green border = Completed
  - Red border = Cancelled

### Calendar Layout
- **Week view** - Default, detailed
- **Month view** - Overview, compact
- Day columns, shift rows
- Click shift to edit (client) or view (caregiver)

### Mobile Responsive
- Collapsible sidebar
- Stacked calendar on mobile
- Swipe navigation between weeks
- Touch-friendly buttons

---

## 🧪 Testing Strategy

### Unit Tests (Recommended)
- Conflict detection algorithm
- Time overlap calculation
- Date range generation
- Color contrast calculation

### Integration Tests
- API route authentication
- Database transactions
- Email sending

### E2E Tests (Playwright/Cypress)
- Create shift type
- Assign caregiver to shift
- Generate patterns
- Request time-off
- Approve request

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="..."

# Email (Phase 3)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="Zorgdossier <noreply@example.com>"

# App
NEXT_PUBLIC_URL="https://yourdomain.com"

# Cron (Phase 2 - optional)
CRON_SECRET="random-secret-here"
```

### Database Migration
```bash
npx prisma migrate deploy
```

### Build & Deploy
```bash
npm run build
# Deploy to Vercel/Railway/etc.
```

---

## 📈 Future Enhancements

### Phase 4 (Advanced Features)
- Shift swap between caregivers
- Shift marketplace (offer shifts to team)
- Clock in/out functionality
- Overtime tracking
- Export schedules (PDF, Excel, .ics)

### Phase 5 (Integrations)
- Google Calendar sync (two-way)
- iCal export/import
- SMS notifications
- Push notifications (mobile app)
- Slack/Teams integration

### Phase 6 (Intelligence)
- AI-powered scheduling suggestions
- Conflict resolution assistance
- Optimal shift distribution
- Workload balancing
- Predictive understaffing alerts

---

## 💰 ROI & Business Value

### Time Savings
- **Manual scheduling**: 2-3 hours/week
- **With patterns**: 15 minutes/week
- **Savings**: ~2.5 hours/week = 130 hours/year per client

### Error Reduction
- Eliminate double-booking
- Prevent understaffing
- Reduce miscommunication
- Automatic conflict detection

### Improved Experience
- **Clients**: Less admin work, better oversight
- **Caregivers**: Clear schedule, easy time-off requests
- **Families**: Confidence in coverage

---

## 📞 Support & Questions

### Common Issues

**Q: Migration fails with relationship error**
A: Make sure to add new relations to both ClientProfile and CaregiverProfile models

**Q: Colors not showing in calendar**
A: Check that caregiver has color set in profile, and getContrastingTextColor is imported

**Q: Conflict detection not working**
A: Verify time overlap algorithm, check for timezone issues

**Q: Emails not sending (Phase 3)**
A: Check SMTP credentials, verify firewall allows outbound port 587

### Development Tips

1. **Start with Phase 1** - Get visual feedback early
2. **Use existing UI components** - Don't reinvent the wheel
3. **Test with real data** - Create test caregivers with various scenarios
4. **Mobile test early** - Don't wait until the end
5. **Consider performance** - Index date columns, optimize queries

---

## 📚 File Structure

```
zorgdossier/
├── app/
│   ├── api/
│   │   └── scheduling/
│   │       ├── shift-types/
│   │       │   └── route.ts ✅ (Complete)
│   │       ├── shifts/
│   │       │   └── route.ts ✅ (Complete)
│   │       └── conflicts/
│   │           └── route.ts ✅ (Complete)
│   │
│   └── dashboard/
│       ├── rooster/              🟡 (To implement)
│       │   ├── page.tsx
│       │   ├── shift-types/
│       │   └── patronen/
│       └── mijn-rooster/         🟡 (To implement)
│           └── page.tsx
│
├── components/
│   ├── scheduling/               🟡 (To implement)
│   │   ├── ScheduleCalendar.tsx
│   │   ├── ShiftCard.tsx
│   │   ├── ShiftAssignmentModal.tsx
│   │   └── TimeOffRequestForm.tsx
│   └── ui/
│       └── CaregiverBadge.tsx    🟡 (To implement)
│
├── lib/
│   ├── constants/
│   │   └── colors.ts             ✅ (Complete)
│   └── email/
│       └── notifications.ts      🔴 (Phase 3)
│
├── prisma/
│   ├── schema.prisma             ✅ (Updated)
│   └── migrations/               ✅ (Applied)
│
└── docs/
    └── implementation-guides/    ✅ (Complete)
        ├── SCHEDULING_OVERVIEW.md
        ├── SCHEDULING_PHASE1_GUIDE.md
        ├── SCHEDULING_PHASE2_GUIDE.md
        └── SCHEDULING_PHASE3_GUIDE.md
```

---

## 🎓 Learning Resources

### Relevant Docs
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [date-fns](https://date-fns.org/)
- [Nodemailer](https://nodemailer.com/)

### Similar Systems
- When2Work
- Deputy
- Homebase
- Planday

---

## ✨ Summary

You now have:
- ✅ Complete database schema
- ✅ All Phase 1 API routes
- ✅ Color system implementation
- ✅ Comprehensive implementation guides for all 3 phases
- ✅ Clear roadmap and architecture

**Next step:** Start with [Phase 1 Guide](./SCHEDULING_PHASE1_GUIDE.md) to build the UI!

---

*Last updated: October 7, 2025*
*Version: 1.0*
