import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import MijnTakenClient from "@/components/dashboard/MijnTakenClient"

export default async function MijnTakenPage() {
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

  const clientsForLayout = user.caregiverProfile.clientRelationships.map(rel => ({
    id: rel.client.id,
    name: rel.client.name,
    email: rel.client.user.email,
  }))

  return (
    <DashboardLayout userName={user.email} userRole={user.role} clients={clientsForLayout}>
      <MijnTakenClient caregiverId={user.caregiverProfile.id} />
    </DashboardLayout>
  )
}
