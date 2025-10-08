import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import MijnRoosterClient from "@/components/scheduling/MijnRoosterClient"

export default async function MijnRoosterPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
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

  if (user.role !== "CAREGIVER" || !user.caregiverProfile) {
    redirect("/dashboard")
  }

  const clients = user.caregiverProfile.clientRelationships.map((rel) => rel.client)
  const clientsForLayout = user.caregiverProfile.clientRelationships.map(rel => ({
    id: rel.client.id,
    name: rel.client.name,
    email: rel.client.user.email,
  }))

  return (
    <DashboardLayout userName={user.email} userRole={user.role} clients={clientsForLayout}>
      <MijnRoosterClient
        caregiverId={user.caregiverProfile.id}
        clients={clients}
      />
    </DashboardLayout>
  )
}
