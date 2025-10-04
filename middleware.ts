import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiRoute = nextUrl.pathname.startsWith("/api")
  const isAuthRoute = nextUrl.pathname.startsWith("/login") ||
                      nextUrl.pathname.startsWith("/register") ||
                      nextUrl.pathname.startsWith("/verify-email")
  const isPublicRoute = nextUrl.pathname === "/"
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard")
  const isProfileRoute = nextUrl.pathname.startsWith("/profile")

  // Allow API routes
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Redirect non-logged-in users to login for protected routes
  if (!isLoggedIn && (isDashboardRoute || isProfileRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
