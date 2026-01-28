"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Navbar } from "@/components/layout/Navbar"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Shield, Mail } from "lucide-react"

interface Profile {
    id: string
    full_name: string
    email?: string
    role: string
}

export default function AdminProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setProfile({ ...data, email: user.email })
            }
            setLoading(false)
        }
        fetchProfile()
    }, [])

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error("Error signing out:", error)
        } finally {
            router.refresh()
            window.location.href = '/login'
        }
    }

    if (loading) return null

    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className="max-w-md mx-auto">
                <Card>
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Admin Portal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted p-4 rounded-lg space-y-3">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">Role</p>
                                    <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
                                Dashboard
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/admin/dashboard?tab=menu')}>
                                Menu Mgmt
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/admin/orders')}>
                                Orders
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/admin/users')}>
                                Users
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </AuthGuard >
    )
}
