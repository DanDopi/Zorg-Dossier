import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import MyClientsClient from "@/components/dashboard/MyClientsClient"

export default async function MyClientsPage() {
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

  // Only caregivers can access this page
  if (user.role !== "CAREGIVER") {
    redirect("/dashboard")
  }

  return <MyClientsClient user={user} />
}
