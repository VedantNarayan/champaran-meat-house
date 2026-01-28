"use client"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DevTools() {
    const [status, setStatus] = useState("")
    const [currentRole, setCurrentRole] = useState("")
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setCurrentRole("Not Logged In")
            setLoading(false)
            return
        }

        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setCurrentRole(data?.role || "unknown")
        setLoading(false)
    }

    const setRole = async (role: 'admin' | 'driver' | 'customer') => {
        setStatus(`Setting role to ${role}...`)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return setStatus("Please login first")

        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', user.id)

        if (error) {
            setStatus("Error: " + error.message)
        } else {
            setStatus(`Success! You are now a ${role}`)
            setCurrentRole(role)
        }
    }

    if (loading) return <div className="p-10">Loading...</div>

    return (
        <div className="p-10 max-w-md mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">Dev Tools: Role Switcher</h1>
                <p className="text-muted-foreground">Current Role: <span className="font-mono font-bold text-black dark:text-white">{currentRole}</span></p>
                {currentRole === 'Not Logged In' && (
                    <Button variant="link" onClick={() => router.push('/login')} className="p-0 h-auto">Go to Login</Button>
                )}
            </div>

            <div className="grid gap-3">
                <Button onClick={() => setRole('admin')} className="w-full bg-blue-600 hover:bg-blue-700">
                    Become Admin (Access /admin/dashboard)
                </Button>
                <Button onClick={() => setRole('driver')} className="w-full bg-amber-600 hover:bg-amber-700">
                    Become Driver (Access /driver)
                </Button>
                <Button onClick={() => setRole('customer')} className="w-full" variant="outline">
                    Reset to Customer
                </Button>
            </div>

            {status && (
                <div className="p-3 bg-muted rounded-md text-sm font-mono">
                    {status}
                </div>
            )}

            <div className="pt-8 border-t">
                <h2 className="text-sm font-semibold mb-2">Quick Links</h2>
                <div className="flex flex-col gap-2">
                    <Button variant="ghost" className="justify-start opacity-70 hover:opacity-100" onClick={() => router.push('/admin/dashboard')}>
                        → Go to Admin Dashboard
                    </Button>
                    <Button variant="ghost" className="justify-start opacity-70 hover:opacity-100" onClick={() => router.push('/driver')}>
                        → Go to Driver Dashboard
                    </Button>
                </div>
            </div>
        </div>
    )
}
