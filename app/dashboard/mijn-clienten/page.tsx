import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import MijnClientenClient from "@/components/dashboard/MijnClientenClient"

export default async function MijnClientenPage() {
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

  // Only caregivers can access this page
  if (user.role !== "CAREGIVER") {
    redirect("/dashboard")
  }

  // Prepare clients list for caregivers
  const clients = user.caregiverProfile
    ? user.caregiverProfile.clientRelationships.map(rel => ({
        id: rel.client.id,
        name: rel.client.name,
        email: rel.client.user.email,
      }))
    : []

  return <MijnClientenClient user={user} clients={clients} />
}
