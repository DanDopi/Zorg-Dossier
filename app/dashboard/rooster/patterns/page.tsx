import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import ShiftPatternManagement from "@/components/scheduling/ShiftPatternManagement"

export default async function PatternsPage() {
  const session = await auth()

  if (!session?.user?.id) {
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

  const caregivers = user.clientProfile.caregiverRelationships.map((rel) => rel.caregiver)

  return (
    <DashboardLayout userName={user.email} userRole={user.role}>
      <ShiftPatternManagement
        clientId={user.clientProfile.id}
        shiftTypes={user.clientProfile.shiftTypes}
        caregivers={caregivers}
      />
    </DashboardLayout>
  )
}
