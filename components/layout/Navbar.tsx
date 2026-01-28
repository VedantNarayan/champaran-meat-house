"use client"

import React from "react"
import Link from "next/link"
import { ShoppingBag, Menu as MenuIcon, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { supabase } from "@/lib/supabaseClient"
import { User } from "@supabase/supabase-js"

type UserWithRole = User & {
    role?: string
}

export function Navbar() {
    const { totalItems } = useCart()
    const [user, setUser] = React.useState<UserWithRole | null>(null)

    React.useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                // Fetch profile to get role
                const { data } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()

                setUser({ ...session.user, role: data?.role || 'customer' })
            } else {
                setUser(null)
            }
        }

        getUser()

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                setUser({ ...session.user, role: data?.role || 'customer' })
            } else {
                setUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center w-full px-4 md:px-6">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <img src="/Logo.jpeg" alt="Champaran Meat House" className="h-12 w-auto object-contain rounded-md" />
                </Link>

                <div className="flex-1" />

                <nav className="flex items-center space-x-4">
                    <Link href="/cart">
                        <Button variant="ghost" size="icon" className="relative">
                            <ShoppingBag className="h-5 w-5" />
                            <span className="sr-only">Cart</span>
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                    {totalItems}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {user ? (
                        <Link href={
                            user.role === 'driver' ? '/driver/profile' :
                                user.role === 'admin' ? '/admin/profile' :
                                    '/account'
                        }>
                            <Button variant="ghost" size="icon">
                                <UserIcon className="h-5 w-5" />
                                <span className="sr-only">Account</span>
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/login">
                            <Button variant="default" size="sm" className="rounded-full">
                                Login
                            </Button>
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    )
}
