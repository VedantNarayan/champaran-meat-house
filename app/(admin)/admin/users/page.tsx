"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

import { AuthGuard } from "@/components/auth/AuthGuard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft, User } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Eye, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface Profile {
    id: string
    full_name: string | null
    role: string
    created_at?: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
    const [userOrders, setUserOrders] = useState<any[]>([])
    const [loadingOrders, setLoadingOrders] = useState(false)

    const fetchOrders = async (userId: string) => {
        setLoadingOrders(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (data) setUserOrders(data)
        setLoadingOrders(false)
    }

    const handleViewOrders = (user: Profile) => {
        setSelectedUser(user)
        fetchOrders(user.id)
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure? This will delete the user and set their orders to NULL user.")) return

        // Delete from auth.users via API is tricky client-side without service role. 
        // We can only delete from public.profiles if cascading, but auth.users requires admin API.
        // However, RLS might block deletion.
        // Let's try deleting profile.

        const { error } = await supabase.from('profiles').delete().eq('id', userId)
        if (error) {
            alert("Error deleting user: " + error.message)
        } else {
            setProfiles(profiles.filter(p => p.id !== userId))
        }
    }

    const updateOrderStatus = async (orderId: string, status: string) => {
        const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
        if (!error) {
            setUserOrders(userOrders.map(o => o.id === orderId ? { ...o, status } : o))
        }
    }

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm("Delete this order?")) return
        const { error } = await supabase.from('orders').delete().eq('id', orderId)
        if (!error) {
            setUserOrders(userOrders.filter(o => o.id !== orderId))
        }
    }

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setProfiles(data || [])
            } catch (error) {
                console.error("Error fetching profiles:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchProfiles()
    }, [])

    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Registered Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4">Loading users...</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No.</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profiles.map((profile, index) => (
                                        <TableRow key={profile.id}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell>{profile.full_name || 'N/A'}</TableCell>
                                            <TableCell className="capitalize">{profile.role}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs font-mono">{profile.id}</TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleViewOrders(profile)}>
                                                    <Eye className="w-4 h-4 mr-1" /> Orders
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(profile.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {profiles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Orders for {selectedUser?.full_name}</DialogTitle>
                        </DialogHeader>

                        {loadingOrders ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : userOrders.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">No orders found for this user.</div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>{format(new Date(order.created_at), 'PP p')}</TableCell>
                                                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                                                <TableCell className="font-bold">₹{order.total_amount}</TableCell>
                                                <TableCell>
                                                    <select
                                                        className="border rounded p-1 text-sm bg-background"
                                                        value={order.status}
                                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                    >
                                                        {['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteOrder(order.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AuthGuard>
    )
}
