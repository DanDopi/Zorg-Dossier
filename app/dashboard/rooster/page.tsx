import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import RoosterClient from "@/components/scheduling/RoosterClient"

export default async function RoosterPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: {
        include: {
          caregiverRelationships: {
            where: { status: "ACTIVE" },
            include: {
              caregiver: true,
            },
          },
          shiftTypes: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "CLIENT" || !user.clientProfile) {
    redirect("/dashboard")
  }

  const caregivers = user.clientProfile.caregiverRelationships.map(
    (rel) => rel.caregiver
  )

  return (
    <DashboardLayout userName={user.email} userRole={user.role}>
      <RoosterClient
        clientId={user.clientProfile.id}
        caregivers={caregivers}
        shiftTypes={user.clientProfile.shiftTypes}
      />
    </DashboardLayout>
  )
}
