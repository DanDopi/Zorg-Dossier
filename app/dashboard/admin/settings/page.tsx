import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import AdminSettingsClient from "@/components/dashboard/AdminSettingsClient"

export default async function AdminSettingsPage() {
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

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout userName={user.email} userRole={user.role}>
      <AdminSettingsClient user={user} />
    </DashboardLayout>
  )
}
