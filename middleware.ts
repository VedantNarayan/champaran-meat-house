import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create Supabase Middleware Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Refresh Session
    // This allows you to update the session or refresh the token if needed
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Define Protected Routes and Role Logic
    const url = request.nextUrl.clone()
    const path = url.pathname

    if (user) {
        // Fetch Role from Profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role || 'customer'

        // Driver: Only /driver
        if (role === 'driver') {
            if (!path.startsWith('/driver') && !isSystemPath(path)) {
                url.pathname = '/driver'
                return NextResponse.redirect(url)
            }
        }

        // Admin: Only /admin/*
        if (role === 'admin') {
            if (!path.startsWith('/admin') && !isSystemPath(path)) {
                url.pathname = '/admin/dashboard'
                return NextResponse.redirect(url)
            }
        }

        // Customer: Block /driver, /admin
        if (role === 'customer') {
            if (path.startsWith('/driver') || path.startsWith('/admin')) {
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }
    } else {
        // Not Logged In
        if (path.startsWith('/driver') || path.startsWith('/admin')) {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return response
}

function isSystemPath(path: string) {
    return (
        path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.startsWith('/static') ||
        path.includes('.') ||
        path === '/favicon.ico'
    )
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
