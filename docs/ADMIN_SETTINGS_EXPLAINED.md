# Admin Systeeminstellingen - Uitleg

## 1. Algemene Systeeminstellingen

### Systeemnaam
- **Wat het is**: De naam van uw zorgsysteem zoals die wordt weergegeven in de applicatie
- **Standaard**: "DaNiKo Zorgdossier"
- **Gebruik**: Deze naam verschijnt op de website, in e-mails, en in rapporten
- **Voorbeeld**: U kunt dit wijzigen naar uw eigen organisatienaam

### Max bestandsgrootte (MB)
- **Wat het is**: De maximale grootte van foto's die kunnen worden geüpload bij zorgrapportages
- **Standaard**: 5 MB
- **Gebruik**: Voorkomt dat gebruikers te grote bestanden uploaden die de server belasten
- **Advies**: 5-10 MB is voldoende voor foto's

### Sessie timeout (minuten)
- **Wat het is**: Hoe lang een gebruiker ingelogd blijft zonder activiteit
- **Standaard**: 30 minuten
- **Gebruik**: Voor veiligheid wordt de gebruiker automatisch uitgelogd na deze periode van inactiviteit
- **Advies**: 30-60 minuten balanceert veiligheid en gebruiksgemak

### Onderhoudsmodus
- **Wat het is**: Schakel het systeem tijdelijk uit voor onderhoud
- **Standaard**: Uit (false)
- **Gebruik**:
  - AAN: Alleen administrators kunnen inloggen, normale gebruikers zien een onderhoudsmelding
  - UIT: Iedereen kan normaal gebruik maken van het systeem
- **Wanneer gebruiken**: Bij updates, database onderhoud, of kritieke reparaties

---

## 2. E-mail Instellingen

### E-mail notificaties
- **Wat het is**: Schakel alle e-mailnotificaties in of uit
- **Standaard**: Aan (true)
- **Gebruik**:
  - AAN: Systeem stuurt e-mails bij uitnodigingen, nieuwe rapporten, etc.
  - UIT: Geen enkele e-mail wordt verstuurd
- **Wanneer uitschakelen**: Bij problemen met e-mailserver of tijdens testing

### SMTP Server
- **Wat het is**: Het adres van uw e-mailserver
- **Voorbeelden**:
  - Gmail: `smtp.gmail.com`
  - Outlook: `smtp.office365.com`
  - Eigen server: `mail.uwdomein.nl`
- **Vereist**: Ja, als e-mail notificaties aan staan

### SMTP Poort
- **Wat het is**: De poort waarop de e-mailserver verbindingen accepteert
- **Standaard**: 587 (TLS)
- **Andere opties**:
  - 465 (SSL)
  - 25 (onversleuteld, niet aangeraden)

### SMTP Gebruikersnaam
- **Wat het is**: Het e-mailadres of gebruikersnaam voor authenticatie
- **Voorbeeld**: `noreply@daniko-care.nl`
- **Gebruik**: Dit wordt gebruikt om in te loggen op de e-mailserver

---

## 3. Beveiligingsinstellingen

### E-mail verificatie vereist
- **Wat het is**: Nieuwe gebruikers moeten hun e-mailadres bevestigen
- **Standaard**: Uit (false)
- **Gebruik**:
  - AAN: Gebruikers krijgen verificatie-email, moeten klikken om account te activeren
  - UIT: Accounts zijn direct actief na aanmaken
- **Advies**: Aan voor betere beveiliging

### Twee-factor authenticatie (2FA)
- **Wat het is**: Extra beveiligingslaag bij inloggen met code via app/SMS
- **Standaard**: Uit (false)
- **Gebruik**:
  - AAN: Gebruikers moeten extra code invoeren bij inloggen
  - UIT: Alleen wachtwoord nodig
- **Advies**: Aan voor gevoelige zorginformatie
- **Let op**: Nog niet geïmplementeerd - toekomstige functionaliteit

### Min. wachtwoordlengte
- **Wat het is**: Minimum aantal tekens voor wachtwoorden
- **Standaard**: 8 tekens
- **Gebruik**: Dwingt sterke wachtwoorden af bij registratie
- **Advies**: Minimaal 8, bij voorkeur 10-12 tekens

### Max. inlogpogingen
- **Wat het is**: Aantal mislukte inlogpogingen voordat account tijdelijk geblokkeerd wordt
- **Standaard**: 5 pogingen
- **Gebruik**: Beschermt tegen brute-force aanvallen
- **Advies**: 3-5 pogingen is gebruikelijk
- **Let op**: Nog niet geïmplementeerd - toekomstige functionaliteit

---

## 4. Privacy & Data Instellingen

### Data export toestaan
- **Wat het is**: Sta gebruikers toe hun gegevens te downloaden (AVG/GDPR)
- **Standaard**: Aan (true)
- **Gebruik**:
  - AAN: Gebruikers kunnen hun rapportages en gegevens exporteren
  - UIT: Export functie is uitgeschakeld
- **Let op**: AVG/GDPR vereist meestal dat gebruikers hun data kunnen opvragen
- **Status**: Nog niet geïmplementeerd - toekomstige functionaliteit

### Data bewaarperiode (dagen)
- **Wat het is**: Hoe lang zorgrapportages bewaard blijven
- **Standaard**: 365 dagen (1 jaar)
- **Gebruik**: Oude rapporten worden automatisch verwijderd na deze periode
- **Advies**:
  - Wettelijk minimum: Vaak 5-7 jaar voor medische gegevens
  - Vraag juridisch advies voor uw situatie
- **Let op**: Nog niet geïmplementeerd - toekomstige functionaliteit

### Log bewaarperiode (dagen)
- **Wat het is**: Hoe lang systeemlogboeken (wie deed wat, wanneer) bewaard blijven
- **Standaard**: 90 dagen (3 maanden)
- **Gebruik**: Voor audits en troubleshooting
- **Advies**: 30-180 dagen is gebruikelijk
- **Let op**: Nog niet geïmplementeerd - toekomstige functionaliteit

---

## Systeeminformatie (Read-only)

### Versie
- Huidige softwareversie van het systeem

### Database
- Type database dat gebruikt wordt (PostgreSQL)

### Omgeving
- Development, Staging, of Production

### Laatste update
- Datum van laatste systeemupdate

---

## Huidige Status

**Volledig functioneel:**
- ✅ Alle instellingen kunnen worden opgeslagen in de database
- ✅ Instellingen worden geladen bij pagina bezoek
- ✅ Per categorie opslaan mogelijk

**Nog te implementeren:**
- ⏳ Onderhoudsmodus daadwerkelijk toepassen
- ⏳ E-mail SMTP configuratie daadwerkelijk gebruiken
- ⏳ Wachtwoordlengte validatie toepassen
- ⏳ 2FA implementatie
- ⏳ Max inlogpogingen blokkering
- ⏳ Data export functionaliteit
- ⏳ Automatische data verwijdering

**Belangrijk:** De instellingen worden nu opgeslagen, maar sommige functionaliteiten moeten nog worden geïmplementeerd om de instellingen daadwerkelijk te gebruiken in het systeem.
