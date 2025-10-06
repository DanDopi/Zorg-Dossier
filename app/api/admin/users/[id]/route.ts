import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen gebruikers bewerken" },
        { status: 403 }
      )
    }

    const { id } = await params
    const { name, role } = await request.json()

    // Get the user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id },
      include: {
        clientProfile: true,
        caregiverProfile: true,
      },
    })

    if (!userToUpdate) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    // Regular ADMIN cannot edit SUPER_ADMIN or ADMIN users
    if (user.role === "ADMIN" && (userToUpdate.role === "SUPER_ADMIN" || userToUpdate.role === "ADMIN")) {
      return NextResponse.json(
        { error: "Je hebt geen toestemming om deze gebruiker te bewerken" },
        { status: 403 }
      )
    }

    // Only SUPER_ADMIN can change role to ADMIN
    if (role === "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Alleen Super Administrators kunnen gebruikers tot Admin promoveren" },
        { status: 403 }
      )
    }

    // Nobody can change role to SUPER_ADMIN
    if (role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super Admin rol kan niet via de interface worden toegewezen" },
        { status: 403 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
      },
    })

    // Update profile name if provided
    if (name) {
      if (userToUpdate.clientProfile) {
        await prisma.clientProfile.update({
          where: { userId: id },
          data: { name },
        })
      } else if (userToUpdate.caregiverProfile) {
        await prisma.caregiverProfile.update({
          where: { userId: id },
          data: { name },
        })
      }
    }

    // Handle profile changes if role changed
    if (userToUpdate.role !== role) {
      // Remove old profile
      if (userToUpdate.role === "CLIENT" && userToUpdate.clientProfile) {
        await prisma.clientProfile.delete({
          where: { userId: id },
        })
      } else if (userToUpdate.role === "CAREGIVER" && userToUpdate.caregiverProfile) {
        await prisma.caregiverProfile.delete({
          where: { userId: id },
        })
      }

      // Create new profile with default values
      if (role === "CLIENT") {
        await prisma.clientProfile.create({
          data: {
            userId: id,
            name: name || "New Client",
            dateOfBirth: new Date(),
            address: "Update address",
          },
        })
      } else if (role === "CAREGIVER") {
        await prisma.caregiverProfile.create({
          data: {
            userId: id,
            name: name || "New Caregiver",
            phoneNumber: "Update phone",
            address: "Update address",
          },
        })
      }
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Admin users PATCH error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen gebruikers verwijderen" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Prevent deleting yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Je kunt jezelf niet verwijderen" },
        { status: 400 }
      )
    }

    // Get the user to delete
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    })

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    // SUPER_ADMIN users cannot be deleted
    if (userToDelete.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super Admin gebruikers kunnen niet worden verwijderd" },
        { status: 403 }
      )
    }

    // Regular ADMIN cannot delete other ADMIN users
    if (user.role === "ADMIN" && userToDelete.role === "ADMIN") {
      return NextResponse.json(
        { error: "Je hebt geen toestemming om Admin gebruikers te verwijderen" },
        { status: 403 }
      )
    }

    // Delete user (profiles will be cascade deleted)
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin users DELETE error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
