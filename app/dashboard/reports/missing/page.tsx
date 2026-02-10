import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import MissingReportsClient from "@/components/dashboard/MissingReportsClient"

export default async function MissingReportsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clientProfile: true,
      caregiverProfile: true,
    },
  })

  if (!user) {
    redirect("/dashboard")
  }

  // Allow both clients and caregivers to access this page
  if (user.role !== "CLIENT" && user.role !== "CAREGIVER") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout userName={user.email} userRole={user.role}>
      <MissingReportsClient
        user={{
          id: user.id,
          email: user.email,
          role: user.role,
          clientProfile: user.clientProfile,
          caregiverProfile: user.caregiverProfile,
        }}
      />
    </DashboardLayout>
  )
}
