import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import TeamClient from "@/components/dashboard/TeamClient"

export default async function TeamPage() {
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

  return <TeamClient user={user} />
}
