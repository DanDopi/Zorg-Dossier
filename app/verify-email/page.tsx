"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Ongeldige verificatielink. Geen token gevonden.")
      return
    }

    async function verifyEmail() {
      try {
        const response = await fetch("/api/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Verificatie mislukt")
        }

        setStatus("success")
        setMessage("Uw email is succesvol geverifieerd!")

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?verified=true")
        }, 3000)
      } catch (err) {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : 'Verificatie mislukt')
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {status === "success" && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === "error" && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          <CardTitle className={`text-2xl text-center ${
            status === "success" ? "text-green-600" :
            status === "error" ? "text-red-600" :
            "text-blue-600"
          }`}>
            {status === "loading" && "Email Verifiëren..."}
            {status === "success" && "Verificatie Succesvol!"}
            {status === "error" && "Verificatie Mislukt"}
          </CardTitle>

          <CardDescription className="text-center">
            {status === "loading" && "Een moment geduld alstublieft..."}
            {status === "success" && "Uw account is geactiveerd"}
            {status === "error" && "Er is iets misgegaan"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {message}
          </p>

          {status === "success" && (
            <div className="space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                U wordt automatisch doorgestuurd naar de login pagina...
              </p>
              <Link href="/login" className="block">
                <Button className="w-full" variant="default">
                  Direct naar Login
                </Button>
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <Link href="/login" className="block">
                <Button className="w-full" variant="outline">
                  Terug naar Login
                </Button>
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Neem contact op als het probleem aanhoudt
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
