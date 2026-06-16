import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/dashboard':     ['super_admin', 'sales', 'technician', 'accountant', 'manager'],
  '/crm':           ['super_admin', 'sales', 'manager'],
  '/customers':     ['super_admin', 'sales', 'accountant', 'manager'],
  '/quotations':    ['super_admin', 'sales', 'accountant', 'manager'],
  '/invoices':      ['super_admin', 'accountant', 'manager', 'sales'],
  '/inventory':     ['super_admin', 'sales', 'accountant', 'manager'],
  '/projects':      ['super_admin', 'sales', 'manager'],
  '/tickets':       ['super_admin', 'sales', 'manager'],
  '/contracts':     ['super_admin', 'sales', 'accountant', 'manager'],
  '/expenses':      ['super_admin', 'sales', 'accountant', 'manager', 'technician'],
  '/assets':        ['super_admin', 'sales', 'accountant', 'manager', 'technician'],
  '/reports':       ['super_admin', 'manager', 'accountant'],
  '/activity-logs': ['super_admin', 'manager'],
  '/search':        ['super_admin', 'sales', 'accountant', 'manager'],
  '/settings':      ['super_admin'],
  '/users':         ['super_admin'],
  '/my-projects':   ['technician'],
  '/my-tickets':    ['technician'],
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/setup')
  ) {
    if (user && (pathname.startsWith('/login') || pathname.startsWith('/reset-password'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Require auth for everything else
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, is_active, setup_completed')
    .eq('id', user.id)
    .single()

  if (!userData) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=no_profile', request.url))
  }

  if (!userData.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  const userRole = userData.role as UserRole

  // Super admin first-login: redirect to setup wizard
  if (
    userRole === 'super_admin' &&
    !userData.setup_completed &&
    !pathname.startsWith('/setup')
  ) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // Role-based access control
  for (const [route, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
      if (userRole === 'technician') {
        return NextResponse.redirect(new URL('/my-projects', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
