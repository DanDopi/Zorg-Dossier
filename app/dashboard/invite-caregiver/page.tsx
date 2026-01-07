import { redirect } from "next/navigation"
import { auth } from "@/auth"
import InviteCaregiverClient from "@/components/dashboard/InviteCaregiverClient"

export default async function InviteCaregiverPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <InviteCaregiverClient
      userName={session.user.name || session.user.email || "Gebruiker"}
      userRole={session.user.role || "CLIENT"}
    />
  )
}
