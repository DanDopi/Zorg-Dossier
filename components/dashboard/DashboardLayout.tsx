"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClientProvider, useClient } from "@/lib/ClientContext"

interface Client {
  id: string
  name: string
  email: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  userName: string
  userRole: string
  clients?: Client[]
}

function DashboardLayoutContent({ children, userName, userRole, clients }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { selectedClient, setSelectedClient } = useClient()
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [pendingClient, setPendingClient] = useState<Client | null>(null)

  const isCaregiver = userRole === "CAREGIVER"

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const handleClientChange = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId)
    if (!client) return

    if (selectedClient && selectedClient.id !== clientId) {
      setPendingClient(client)
      setShowSwitchDialog(true)
    } else {
      setSelectedClient(client)
    }
  }

  const confirmClientSwitch = () => {
    if (pendingClient) {
      setSelectedClient(pendingClient)
      setPendingClient(null)
    }
    setShowSwitchDialog(false)
  }

  const cancelClientSwitch = () => {
    setPendingClient(null)
    setShowSwitchDialog(false)
  }

  // Client menu items
  const clientMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/dashboard/rapporteren", label: "Rapporteren", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { href: "/dashboard/medicatie", label: "Medicatie", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
    { href: "/dashboard/io-registratie", label: "I&O registratie", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { href: "/dashboard/team", label: "Mijn Zorgverleners", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  ]

  // Caregiver menu items
  const caregiverMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/dashboard/rapporteren", label: "Rapporteren", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { href: "/dashboard/medicatie", label: "Medicatie", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
    { href: "/dashboard/io-registratie", label: "I&O registratie", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { href: "/dashboard/mijn-clienten", label: "Mijn Cliënten", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  ]

  // Admin menu items
  const adminMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/dashboard/admin/users", label: "Gebruikers", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { href: "/dashboard/admin/statistieken", label: "Statistieken", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { href: "/dashboard/admin/settings", label: "Instellingen", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ]

  const showSidebar = userRole === "CLIENT" || userRole === "CAREGIVER" || userRole === "ADMIN" || userRole === "SUPER_ADMIN"
  const menuItems = userRole === "CLIENT"
    ? clientMenuItems
    : (userRole === "ADMIN" || userRole === "SUPER_ADMIN")
    ? adminMenuItems
    : caregiverMenuItems

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Zorgdossier
                </h1>
              </Link>
              <span className="text-sm text-muted-foreground">
                {userRole === "CLIENT" && "Cliënt Dashboard"}
                {userRole === "CAREGIVER" && "Zorgverlener Dashboard"}
                {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && "Admin Dashboard"}
              </span>
            </div>

            {/* Global Client Selector for Caregivers */}
            {isCaregiver && clients && clients.length > 0 && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <Select
                  value={selectedClient?.id || ""}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger className="w-[280px] font-medium border-2 border-blue-200 bg-blue-50">
                    <SelectValue placeholder="Selecteer een cliënt" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-xs text-muted-foreground">{client.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-4">
              <Link href="/profile">
                <div className="text-right hover:bg-gray-50 px-3 py-2 rounded-md cursor-pointer transition-colors">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase()}</p>
                </div>
              </Link>
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profiel
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - For clients and caregivers */}
        {showSidebar && (
          <aside className="w-64 bg-white border-r shadow-sm min-h-screen">
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                // Exact match for /dashboard, otherwise check if path starts with item.href
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={item.icon}
                        />
                      </svg>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${showSidebar ? "" : "container mx-auto"} px-4 py-8`}>
          {/* Warning Banner for Caregivers */}
          {isCaregiver && selectedClient && (
            <div className="mb-4 bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-bold text-blue-900">Actieve Cliënt:</p>
                  <p className="text-blue-800">{selectedClient.name} ({selectedClient.email})</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning if no client selected */}
          {isCaregiver && !selectedClient && clients && clients.length > 0 && (
            <div className="mb-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium text-yellow-900">Selecteer eerst een cliënt in de bovenste balk om te beginnen met werken.</p>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cliënt Wisselen?</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u wilt wisselen naar{" "}
              <strong>{pendingClient?.name}</strong>?
              <br /><br />
              Alle huidige gegevens die u bekijkt zijn voor{" "}
              <strong>{selectedClient?.name}</strong>. Na het wisselen ziet u de gegevens van{" "}
              <strong>{pendingClient?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelClientSwitch}>
              Annuleren
            </Button>
            <Button onClick={confirmClientSwitch}>
              Ja, Wissel Cliënt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <ClientProvider>
      <DashboardLayoutContent {...props} />
    </ClientProvider>
  )
}
