const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Sample report contents in Dutch
const reportTemplates = [
  "Cliënt heeft een goede nacht gehad. Medicatie is op tijd ingenomen. Geen bijzonderheden.",
  "Bezoek uitgevoerd volgens planning. Cliënt was in een goede stemming en heeft goed gegeten.",
  "Persoonlijke verzorging uitgevoerd. Huid ziet er goed uit, geen rode plekken of irritaties.",
  "Ochtendverzorging uitgevoerd. Cliënt heeft ontbijt genuttigd en medicatie ingenomen zonder problemen.",
  "Huishoudelijke taken uitgevoerd. Samen boodschappen gedaan en een wandeling gemaakt.",
  "Avondzorg uitgevoerd. Cliënt heeft goed gegeten en medicatie ingenomen. Klaar voor de nacht.",
  "Douche verzorging uitgevoerd. Cliënt voelt zich fris en heeft geen pijnklachten.",
  "Middagbezoek uitgevoerd. Sociale activiteiten en gesprekken. Cliënt is tevreden.",
  "Transfers en mobiliteit geoefend. Cliënt doet goed mee en maakt vooruitgang.",
  "Avondmaal voorbereid en geholpen met eten. Medicatie op tijd gegeven. Cliënt naar bed begeleid."
]

const additionalVariations = [
  "Extra aandacht besteed aan wondzorg. Wond ziet er goed uit en geneest volgens verwachting.",
  "Fysiotherapie oefeningen gedaan. Cliënt is gemotiveerd en doet goed mee.",
  "Dagbesteding uitgevoerd met creatieve activiteiten. Cliënt heeft genoten van de dag.",
  "Medicijnen beheer gecontroleerd. Alles is op voorraad en correct gedoseerd.",
  "Familie heeft gebeld en bezoek gebracht. Cliënt was blij met het contact.",
  "Bloeddruk en temperatuur gemeten. Waarden zijn stabiel en binnen normale grenzen.",
  "Speciale maaltijd voorbereid voor verjaardag. Cliënt heeft genoten van de aandacht.",
  "Arts bezoek begeleid. Nieuwe medicatie voorgeschreven die vandaag is gestart.",
  "Kapper is langs geweest. Cliënt is tevreden met het nieuwe kapsel.",
  "Nachtdienst rustig verlopen. Cliënt heeft goed geslapen met één toiletbezoek.",
]

async function main() {
  console.log('Starting report generation...')

  // Get all active caregiver-client relationships
  const relationships = await prisma.caregiverClientRelationship.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      caregiver: {
        include: {
          user: true,
        },
      },
      client: {
        include: {
          user: true,
        },
      },
    },
  })

  if (relationships.length === 0) {
    console.log('No active caregiver-client relationships found.')
    return
  }

  console.log(`Found ${relationships.length} active relationships`)

  let totalReportsCreated = 0

  // For each relationship, create 10 reports
  for (const relationship of relationships) {
    const caregiverId = relationship.caregiverId
    const clientId = relationship.clientId
    const caregiverName = relationship.caregiver.name
    const clientName = relationship.client.name

    console.log(`\nCreating reports for ${caregiverName} -> ${clientName}`)

    // Create 10 reports with different dates (spread over the last 30 days)
    for (let i = 0; i < 10; i++) {
      // Create dates going backwards from today
      const daysAgo = i * 3 // Space them out every 3 days
      const reportDate = new Date()
      reportDate.setDate(reportDate.getDate() - daysAgo)
      reportDate.setHours(14, 0, 0, 0) // Set to 2 PM

      // Pick a report template (cycle through them and add variations)
      const allTemplates = [...reportTemplates, ...additionalVariations]
      const content = allTemplates[i % allTemplates.length]

      try {
        const report = await prisma.careReport.create({
          data: {
            caregiverId,
            clientId,
            content,
            reportDate,
          },
        })

        console.log(`  ✓ Report ${i + 1}/10 created (${reportDate.toLocaleDateString('nl-NL')})`)
        totalReportsCreated++
      } catch (error) {
        console.error(`  ✗ Failed to create report ${i + 1}:`, error.message)
      }
    }
  }

  console.log(`\n✓ Done! Created ${totalReportsCreated} reports total.`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
