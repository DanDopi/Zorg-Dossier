"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { signOut } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ActivityMonitorContextType {
  lastActivity: number
  resetActivity: () => void
}

const ActivityMonitorContext = createContext<ActivityMonitorContextType | undefined>(undefined)

export function useActivityMonitor() {
  const context = useContext(ActivityMonitorContext)
  if (!context) {
    throw new Error("useActivityMonitor must be used within ActivityMonitorProvider")
  }
  return context
}

interface ActivityMonitorProviderProps {
  children: React.ReactNode
}

export function ActivityMonitorProvider({ children }: ActivityMonitorProviderProps) {
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [timeoutMinutes, setTimeoutMinutes] = useState(30) // Default 30 minutes
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(60)
  const warningTimerRef = useRef<NodeJS.Timeout>()
  const logoutTimerRef = useRef<NodeJS.Timeout>()
  const countdownIntervalRef = useRef<NodeJS.Timeout>()
  const hasLoggedWarning = useRef(false)

  // Fetch timeout setting from database
  useEffect(() => {
    async function loadTimeoutSetting() {
      try {
        const response = await fetch("/api/settings/session-timeout")
        if (response.ok) {
          const data = await response.json()
          setTimeoutMinutes(data.timeoutMinutes)
        }
      } catch (error) {
        console.error("Failed to fetch session timeout:", error)
      }
    }
    loadTimeoutSetting()
  }, [])

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now())
    setShowWarning(false)

    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    // Only set timers if timeout is at least 2 minutes
    if (timeoutMinutes < 2) {
      if (!hasLoggedWarning.current) {
        console.warn("Session timeout is too short (< 2 minutes), activity monitoring disabled")
        hasLoggedWarning.current = true
      }
      return
    }

    // Set warning timer (1 minute before timeout)
    const warningTime = (timeoutMinutes - 1) * 60 * 1000
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsRemaining(60)

      // Set logout timer (1 minute after warning)
      logoutTimerRef.current = setTimeout(() => {
        handleAutoLogout()
      }, 60 * 1000)
    }, warningTime)
  }, [timeoutMinutes])

  const handleAutoLogout = async () => {
    await signOut({ callbackUrl: "/login?reason=inactivity" })
  }

  const handleStayLoggedIn = () => {
    resetActivity()
  }

  // Track activity events
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      resetActivity()
    }

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Initial timer setup
    resetActivity()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [resetActivity])

  // Countdown timer for warning dialog
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
      }
    }
  }, [showWarning])

  return (
    <ActivityMonitorContext.Provider value={{ lastActivity, resetActivity }}>
      {children}

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={(open) => !open && handleStayLoggedIn()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sessie verloopt binnenkort</DialogTitle>
            <DialogDescription>
              U wordt binnen {secondsRemaining} seconde{secondsRemaining !== 1 ? 'n' : ''} automatisch uitgelogd vanwege inactiviteit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button onClick={handleStayLoggedIn} className="w-full">
              Blijf ingelogd
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActivityMonitorContext.Provider>
  )
}
