import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import MissingMedicationAdministrationsClient from "@/components/dashboard/MissingMedicationAdministrationsClient"

export default async function MissingMedicationAdministrationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: true,
      caregiverProfile: {
        include: {
          clientRelationships: {
            where: { status: "ACTIVE" },
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Allow both CLIENTs and CAREGIVERs (unlike missing reports which is CLIENT only)
  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  if (!isClient && !isCaregiver) {
    redirect("/dashboard") // Only clients and caregivers can access
  }

  // Verify client profile for clients
  if (isClient && !user.clientProfile) {
    redirect("/dashboard")
  }

  // Prepare clients list for caregivers
  const clients = isCaregiver && user.caregiverProfile
    ? user.caregiverProfile.clientRelationships.map(rel => ({
        id: rel.client.id,
        name: rel.client.name,
        email: rel.client.user.email,
      }))
    : undefined

  return (
    <DashboardLayout userName={user.email} userRole={user.role} clients={clients}>
      <MissingMedicationAdministrationsClient user={user} />
    </DashboardLayout>
  )
}
