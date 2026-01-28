"use client"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Plus, Trash2, MapPin } from "lucide-react"

interface Order {
    id: string
    created_at: string
    total_amount: number
    status: string
}

interface Address {
    id: string
    full_name: string
    phone_number: string
    street: string
    city: string
    is_default: boolean
}

interface Profile {
    full_name: string
    phone_number: string
    role: string
}

export default function AccountPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [orders, setOrders] = useState<Order[]>([])

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ full_name: "", phone_number: "" })
    const [updating, setUpdating] = useState(false)

    const [addresses, setAddresses] = useState<Address[]>([])

    // Address State
    const [isAddingAddress, setIsAddingAddress] = useState(false)
    const [newAddress, setNewAddress] = useState({
        full_name: "",
        phone_number: "",
        street: "",
        city: "Patna",
        is_default: false
    })
    const [addressLoading, setAddressLoading] = useState(false)

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/login")
                return
            }

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            // Fetch orders
            const { data: ordersData } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            // Fetch addresses
            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (profileData) {
                setProfile(profileData)
                setEditForm({
                    full_name: profileData.full_name || "",
                    phone_number: profileData.phone_number || ""
                })
            }
            if (ordersData) setOrders(ordersData)
            if (addressData) setAddresses(addressData)
            setLoading(false)
        }

        getProfile()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/")
        router.refresh()
    }

    const handleUpdateProfile = async () => {
        setUpdating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editForm.full_name,
                    phone_number: editForm.phone_number
                })
                .eq('id', user.id)

            if (error) throw error

            setProfile(prev => prev ? { ...prev, ...editForm } : null)
            setIsEditing(false)
        } catch (error: any) {
            alert("Failed to update profile: " + error.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleAddAddress = async () => {
        setAddressLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('user_addresses')
                .insert({
                    user_id: user.id,
                    ...newAddress
                })

            if (error) throw error

            // Refresh addresses
            const { data: addressData } = await supabase
                .from('user_addresses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (addressData) setAddresses(addressData)
            setIsAddingAddress(false)
            setNewAddress({ full_name: "", phone_number: "", street: "", city: "Patna", is_default: false })
        } catch (error: any) {
            alert("Failed to add address: " + error.message)
        } finally {
            setAddressLoading(false)
        }
    }

    const handleDeleteAddress = async (id: string) => {
        if (!confirm("Are you sure you want to delete this address?")) return

        try {
            const { error } = await supabase
                .from('user_addresses')
                .delete()
                .eq('id', id)

            if (error) throw error

            setAddresses(prev => prev.filter(addr => addr.id !== id))
        } catch (error: any) {
            alert("Failed to delete address: " + error.message)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/40 pb-20">
                <Navbar />
                <div className="flex items-center justify-center h-[50vh]">
                    <p className="text-muted-foreground animate-pulse">Loading account...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/40 pb-20">
            <Navbar />
            <main className="container px-4 md:px-6 py-8 max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">My Account</h1>
                    <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
                </div>

                {/* Profile Section */}
                <Card className="border-none shadow-sm relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Profile Details</CardTitle>
                        <Dialog open={isEditing} onOpenChange={setIsEditing}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit Profile</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit Profile</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={editForm.full_name}
                                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={editForm.phone_number}
                                            onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                                            type="tel"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button onClick={handleUpdateProfile} disabled={updating}>
                                        {updating ? "Saving..." : "Save Changes"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <span className="font-semibold text-muted-foreground block text-sm">Full Name</span>
                                <span className="text-lg">{profile?.full_name || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block text-sm">Phone</span>
                                <span className="text-lg">{profile?.phone_number || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block text-sm">Role</span>
                                <span className="text-lg capitalize badge badge-outline">{profile?.role || 'Customer'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {/* Address Book Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Saved Addresses</h2>
                        <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" /> Add New
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Address</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            value={newAddress.full_name}
                                            onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone Number</Label>
                                        <Input
                                            value={newAddress.phone_number}
                                            onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
                                            placeholder="9876543210"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Street Address</Label>
                                        <Input
                                            value={newAddress.street}
                                            onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                            placeholder="Flat / House No / Colony"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>City</Label>
                                        <Input
                                            value={newAddress.city}
                                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddingAddress(false)}>Cancel</Button>
                                    <Button onClick={handleAddAddress} disabled={addressLoading}>
                                        {addressLoading ? "Saving..." : "Save Address"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {addresses.length === 0 ? (
                        <Card className="border-none shadow-sm border-dashed border-2">
                            <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <MapPin className="h-8 w-8 opacity-50" />
                                <p>No saved addresses found.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {addresses.map((addr) => (
                                <Card key={addr.id} className="relative group">
                                    <CardContent className="p-4">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteAddress(addr.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <h3 className="font-semibold">{addr.full_name}</h3>
                                        <p className="text-sm text-muted-foreground">{addr.phone_number}</p>
                                        <div className="mt-2 text-sm">
                                            <p>{addr.street}</p>
                                            <p>{addr.city}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Order History Section */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">Order History</h2>
                    {orders.length === 0 ? (
                        <Card className="border-none shadow-sm">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                No past orders found.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <p className="font-bold text-lg">Order #{order.id.substring(0, 8)}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                            <div className="text-right">
                                                <p className="font-bold">₹{order.total_amount}</p>
                                                <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wide ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <Link href={`/order-status/${order.id}`}>
                                                <Button variant="ghost" size="sm">Track</Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div >
    )
}

