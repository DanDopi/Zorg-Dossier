# Zorgdossier - Care Reporting Platform

Een moderne rapportage-applicatie voor ZZP zorgverleners en cliënten in de zorg.

## 🚀 Technologieën

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL met Prisma ORM
- **Authenticatie:** NextAuth.js v5
- **UI:** Tailwind CSS + shadcn/ui
- **Email:** Nodemailer (SMTP)
- **Icons:** React Icons
- **Talen:** TypeScript, React 19

## 📋 Vereisten

- Node.js 20 of hoger
- PostgreSQL 14 of hoger
- Een SMTP server voor email verzending

## 🗄️ PostgreSQL Database Setup

### Stap 1: PostgreSQL installatie controleren

Zorg ervoor dat PostgreSQL geïnstalleerd is op uw PC. Als het nog niet geïnstalleerd is, download het van:
https://www.postgresql.org/download/windows/

### Stap 2: Database aanmaken in pgAdmin

1. Open pgAdmin
2. Verbind met uw PostgreSQL server
3. Klik met de rechtermuisknop op "Databases"
4. Selecteer: **Create → Database**
5. Vul in:
   - **Database name:** `zorgdossier_dev`
   - **Owner:** `postgres` (of uw eigen gebruiker)
6. Klik op **Save**

### Stap 3: Gebruikers en wachtwoorden

Als u nog geen PostgreSQL gebruiker heeft:

1. In pgAdmin, klik met de rechtermuisknop op "Login/Group Roles"
2. Selecteer **Create → Login/Group Role**
3. **General tab:** Vul een naam in (bijv. `zorgdossier_user`)
4. **Definition tab:** Vul een wachtwoord in
5. **Privileges tab:** Activeer "Can login"
6. Klik op **Save**

**Standaard configuratie:**
- **Username:** `postgres`
- **Password:** Uw PostgreSQL wachtwoord (opgegeven tijdens installatie)
- **Database:** `zorgdossier_dev`
- **Port:** `5432` (standaard)

## ⚙️ Project Setup

### 1. Installeer dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Omgevingsvariabelen configureren

Maak een `.env` bestand in de root directory en kopieer de inhoud van `.env.example`:

\`\`\`bash
# Database
DATABASE_URL="postgresql://postgres:JOUW_WACHTWOORD@localhost:5432/zorgdossier_dev"

# NextAuth
NEXTAUTH_SECRET="run: openssl rand -base64 32 to generate this"
NEXTAUTH_URL="http://localhost:3000"

# SMTP Email
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="noreply@zorgdossier.nl"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
\`\`\`

**Belangrijk:**
- Vervang `JOUW_WACHTWOORD` met uw PostgreSQL wachtwoord
- Genereer een veilige `NEXTAUTH_SECRET` met: `openssl rand -base64 32`
- Configureer uw SMTP instellingen voor email verzending

### 3. Database migratie uitvoeren

\`\`\`bash
npx prisma migrate dev --name init
\`\`\`

Dit commando:
- Maakt alle database tabellen aan
- Genereert de Prisma Client
- Synchroniseert het schema met de database

### 4. Prisma Studio (optioneel)

Om uw database visueel te bekijken:

\`\`\`bash
npx prisma studio
\`\`\`

### 5. Super Admin aanmaken

Voor het aanmaken van de eerste Super Admin account:

\`\`\`bash
npm run setup:superadmin
\`\`\`

Volg de instructies in de console om email en wachtwoord in te voeren.

### 6. Development server starten

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in uw browser.

## 👥 Gebruikersrollen

Het systeem ondersteunt de volgende rollen:

- **Super Admin:** Eerste admin, kan andere admins uitnodigen
- **Admin:** Beheerder met beperkte rechten
- **Client:** Ontvangt zorg, kan zorgverleners uitnodigen
- **Caregiver (Zorgverlener):** Verleent zorg, maakt rapportages
- **Family (Toekomstig):** Familieleden met leestoegang

## 🔑 Belangrijke Features

### Voor Cliënten:
- Profiel aanmaken met persoonlijke gegevens
- Zorgverleners zoeken en uitnodigen
- Dagelijkse zorgrapportages bekijken
- Zorgverleners activeren/deactiveren

### Voor Zorgverleners:
- Profiel aanmaken
- Uitnodigingen accepteren/afwijzen
- Dagelijkse rapportages maken (met foto's)
- Rapportages bewerken (met versiegeschiedenis)
- Rapportages van andere zorgverleners bekijken

### Zorgrapportages:
- Tekst + foto's (max 3 per rapport, 5MB per foto)
- Datum selectie (ook achteraf rapporteren mogelijk)
- Bewerkingsgeschiedenis (origineel blijft behouden)
- Kalenderweergave en dag-navigatie
- Alleen de auteur kan eigen rapporten bewerken

## 📁 Project Structuur

\`\`\`
zorgdossier/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authenticatie routes
│   ├── dashboard/         # Dashboard voor alle rollen
│   ├── register/          # Registratie pagina's
│   └── api/               # API routes
├── components/            # React componenten
│   └── ui/               # shadcn/ui componenten
├── lib/                   # Utility functies
├── prisma/               # Database schema en migraties
│   └── schema.prisma     # Database models
└── scripts/              # Setup scripts
    └── setup-superadmin.js
\`\`\`

## 🎨 Kleurenschema

- **Primary Blue:** `#3B82F6` - Trust & professionaliteit
- **Secondary Green:** `#10B981` - Gezondheid & positief
- **Accent Orange:** `#FB923C` - Warmte & zorg

## 🔒 Beveiliging

- Email verificatie verplicht voor alle gebruikers
- Wachtwoorden worden gehashed met bcrypt
- Session duur: 24 uur
- Rol-gebaseerde toegangscontrole
- Zorgverleners kunnen alleen eigen rapportages bewerken

## 📧 SMTP Configuratie

Voor lokale ontwikkeling kunt u gebruik maken van:

- **Gmail:** smtp.gmail.com (poort 587) - gebruik App Password
- **Outlook:** smtp-mail.outlook.com (poort 587)
- **Mailtrap.io:** Voor test emails (gratis)
- **Eigen SMTP server**

## 🚢 Deployment (VPS)

Instructies voor deployment op uw VPS volgen later in de ontwikkeling.

## 📝 Ontwikkelingsstatus

**Fase 1 (Huidige scope):**
- ✅ Project setup
- ✅ Database schema ontwerp
- 🔄 Authenticatie systeem
- 🔄 Gebruikers registratie & profielen
- 🔄 Zorgverlener uitnodigingen
- 🔄 Zorgrapportages met foto's
- 🔄 Dashboard views

**Toekomstige features:**
- Family member toegang
- Medicatie tracking
- Geavanceerde filters
- PDF export
- Mobile app
- Notificatie systeem

## 🤝 Support

Voor vragen of problemen, neem contact op met de ontwikkelaars.

## 📄 Licentie

Alle rechten voorbehouden © 2025 Zorgdossier
