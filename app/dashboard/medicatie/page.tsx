import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import MedicationManagementClient from "@/components/dashboard/MedicationManagementClient"

export default async function MedicatiePage() {
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

  // Redirect admins to admin panel
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout userName={user.email} userRole={user.role}>
      <MedicationManagementClient user={user} />
    </DashboardLayout>
  )
}
