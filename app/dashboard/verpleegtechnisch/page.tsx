import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import NursingProceduresClient from "@/components/dashboard/NursingProceduresClient"

export default async function VerpleegtechnischPage() {
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

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    redirect("/dashboard")
  }

  const clients = user.role === "CAREGIVER" && user.caregiverProfile
    ? user.caregiverProfile.clientRelationships.map(rel => ({
        id: rel.client.id,
        name: rel.client.name,
        email: rel.client.user.email,
      }))
    : undefined

  return (
    <DashboardLayout userName={user.email} userRole={user.role} clients={clients}>
      <NursingProceduresClient user={user} />
    </DashboardLayout>
  )
}
