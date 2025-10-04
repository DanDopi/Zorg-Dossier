import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import AdminUsersClient from "@/components/dashboard/AdminUsersClient"

export default async function AdminUsersPage() {
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
    <DashboardLayout userName={user.name || user.email} userRole={user.role}>
      <AdminUsersClient user={user} />
    </DashboardLayout>
  )
}
