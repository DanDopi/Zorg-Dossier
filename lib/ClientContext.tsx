"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface SelectedClient {
  id: string
  name: string
  email: string
}

interface ClientContextType {
  selectedClient: SelectedClient | null
  setSelectedClient: (client: SelectedClient | null) => void
  clearSelectedClient: () => void
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClientState] = useState<SelectedClient | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("selectedClient")
    if (stored) {
      try {
        setSelectedClientState(JSON.parse(stored))
      } catch (error) {
        console.error("Error parsing stored client:", error)
        localStorage.removeItem("selectedClient")
      }
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage when changed
  const setSelectedClient = (client: SelectedClient | null) => {
    setSelectedClientState(client)
    if (client) {
      localStorage.setItem("selectedClient", JSON.stringify(client))
    } else {
      localStorage.removeItem("selectedClient")
    }
  }

  const clearSelectedClient = () => {
    setSelectedClientState(null)
    localStorage.removeItem("selectedClient")
  }

  // Don't render children until we've loaded from localStorage
  if (!isInitialized) {
    return null
  }

  return (
    <ClientContext.Provider value={{ selectedClient, setSelectedClient, clearSelectedClient }}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider")
  }
  return context
}
