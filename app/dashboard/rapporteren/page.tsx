import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import RapporterenClient from "@/components/dashboard/RapporterenClient"

export default async function RapporterenPage() {
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
    redirect("/login")
  }

  return <RapporterenClient user={user} />
}
