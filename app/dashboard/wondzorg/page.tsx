import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import WondzorgClient from "@/components/dashboard/WondzorgClient"

export default async function WondzorgPage() {
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

  // Prepare clients list for caregivers
  const clients = user.role === "CAREGIVER" && user.caregiverProfile
    ? user.caregiverProfile.clientRelationships.map(rel => ({
        id: rel.client.id,
        name: rel.client.name,
        email: rel.client.user.email,
      }))
    : undefined

  return (
    <DashboardLayout userName={user.email} userRole={user.role} clients={clients}>
      <WondzorgClient user={user} />
    </DashboardLayout>
  )
}
