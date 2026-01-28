"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/login")
                return
            }

            if (allowedRoles && allowedRoles.length > 0) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (!profile || !allowedRoles.includes(profile.role)) {
                    // Unauthorized
                    router.push('/')
                    return
                }
            }

            setAuthorized(true)
            setLoading(false)
        }

        checkAuth()
    }, [router, allowedRoles])

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-muted/40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!authorized) {
        return null
    }

    return <>{children}</>
}
