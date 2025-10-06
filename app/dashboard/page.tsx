import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ClientDashboard from "@/components/dashboard/ClientDashboard"
import CaregiverDashboard from "@/components/dashboard/CaregiverDashboard"
import AdminDashboard from "@/components/dashboard/AdminDashboard"

export default async function DashboardPage() {
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

  // Render dashboard based on user role
  switch (user.role) {
    case "CLIENT":
      return <ClientDashboard user={user} />
    case "CAREGIVER":
      return <CaregiverDashboard user={user} clients={clients} />
    case "ADMIN":
    case "SUPER_ADMIN":
      return <AdminDashboard user={user} />
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Onbekende gebruikersrol</p>
        </div>
      )
  }
}
