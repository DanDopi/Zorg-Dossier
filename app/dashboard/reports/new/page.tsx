import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import NewReportClient from "@/components/dashboard/NewReportClient"

export default async function NewReportPage() {
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

  // Only caregivers can create reports
  if (user.role !== "CAREGIVER") {
    redirect("/dashboard")
  }

  // Get active clients
  const activeClients = user.caregiverProfile?.clientRelationships || []

  // Prepare clients list for DashboardLayout
  const clients = activeClients.map(rel => ({
    id: rel.client.id,
    name: rel.client.name,
    email: rel.client.user.email,
  }))

  return (
    <DashboardLayout userName={user.email} userRole={user.role} clients={clients}>
      <NewReportClient activeClients={activeClients} />
    </DashboardLayout>
  )
}
