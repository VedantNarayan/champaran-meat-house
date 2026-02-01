"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/layout/Navbar"
import Link from "next/link"

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Fetch role to determine redirect
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single()

            const role = profile?.role || 'customer'

            if (role === 'driver') {
                router.push("/driver")
            } else if (role === 'admin') {
                router.push("/dashboard")
            } else {
                router.push("/")
            }
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-muted/40">
            <Navbar />
            <main className="container flex items-center justify-center py-20 px-4">
                <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl shadow-lg border border-border/50">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold">Welcome Back</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
                    </div>
                    <div className="mt-8 space-y-6">
                        {/* OAuth Section */}
                        <div className="grid gap-2">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={loading}
                                onClick={async () => {
                                    setLoading(true)
                                    const { error } = await supabase.auth.signInWithOAuth({
                                        provider: 'google',
                                        options: {
                                            redirectTo: `${window.location.origin}/auth/callback`,
                                        },
                                    })
                                    if (error) {
                                        setError(error.message)
                                        setLoading(false)
                                    }
                                }}
                                className="w-full"
                            >
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                </svg>
                                Sign in with Google
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                    </div>

                    <form className="mt-6 space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4 rounded-md shadow-sm">
                            <div>
                                <label htmlFor="email-address" className="sr-only">Email address</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-ring focus:border-ring focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-ring focus:border-ring focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <div className="text-right mt-1">
                                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary/90">
                                        Forgot your password?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" disabled={loading}>
                                {loading ? "Signing in..." : "Sign in"}
                            </Button>
                        </div>
                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">Don't have an account? </span>
                            <Link href="/signup" className="font-medium text-primary hover:text-primary/90">
                                Sign up
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
