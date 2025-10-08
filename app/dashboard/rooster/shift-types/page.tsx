import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import ShiftTypeManagement from "@/components/scheduling/ShiftTypeManagement"

export default async function ShiftTypesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "CLIENT" || !user.clientProfile) {
    redirect("/dashboard")
  }

  const shiftTypes = await prisma.shiftType.findMany({
    where: {
      clientId: user.clientProfile.id,
    },
    orderBy: {
      startTime: "asc",
    },
  })

  return (
    <DashboardLayout userName={user.email} userRole={user.role}>
      <ShiftTypeManagement initialShiftTypes={shiftTypes} />
    </DashboardLayout>
  )
}
