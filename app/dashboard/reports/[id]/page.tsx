import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import ReportDetailClient from "@/components/dashboard/ReportDetailClient"

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
      <ReportDetailClient reportId={id} />
    </DashboardLayout>
  )
}
