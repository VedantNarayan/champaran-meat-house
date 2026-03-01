"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Navbar } from "@/components/layout/Navbar"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Package, CheckCircle, MessageCircle, Navigation } from "lucide-react"

interface Order {
    id: string
    created_at: string
    status: string
    total_amount: number
    delivery_address: any
    driver_id?: string
    contact_number?: string
    order_items?: any[]
}

export default function DriverPage() {
    const [activeTab, setActiveTab] = useState("available")
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        // Get current user ID
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        getUser()
    }, [])

    const fetchOrders = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    quantity,
                    menu_items (name)
                )
            `)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })

        if (data) setOrders(data as any)
        setLoading(false)
    }

    useEffect(() => {
        fetchOrders()
        const channel = supabase.channel('driver-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const pickUpOrder = async (orderId: string) => {
        if (!userId) return
        await supabase.from('orders').update({
            status: 'out_for_delivery',
            driver_id: userId
        }).eq('id', orderId)
        fetchOrders()
    }

    const markDelivered = async (orderId: string) => {
        await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
        fetchOrders()
    }

    // Available: Status is 'preparing' OR 'confirmed' OR 'ready' (ready for kitchen/driver processing)
    // We don't filter by !o.driver_id because an admin might revert a delivered order back to 'ready', leaving a stale driver_id.
    const availableOrders = orders.filter(o =>
        o.status === 'preparing' || o.status === 'confirmed' || o.status === 'ready'
    )

    // My Deliveries: Assigned to me and not yet delivered (or delivered recently? keep it simple: out_for_delivery)
    const myDeliveries = orders.filter(o =>
        o.driver_id === userId && o.status === 'out_for_delivery'
    )

    // Delivery History: Assigned to me and status is delivered
    const deliveryHistory = orders.filter(o =>
        o.driver_id === userId && o.status === 'delivered'
    )

    return (
        <AuthGuard allowedRoles={['driver']}>
            <div className="min-h-screen bg-gray-50 pb-20">
                <Navbar />
                <main className="container max-w-md mx-auto py-6 px-4">
                    <h1 className="text-2xl font-bold mb-6">Driver Dashboard</h1>

                    <div className="w-full mb-6">
                        <div className="grid w-full grid-cols-3 p-1 bg-muted rounded-lg">
                            <button
                                onClick={() => setActiveTab("available")}
                                className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === "available"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Ready for Pickup ({availableOrders.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("active")}
                                className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === "active"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Active ({myDeliveries.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === "history"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                History ({deliveryHistory.length})
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {activeTab === "available" && (
                            <>
                                {availableOrders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders ready for pickup.</p>}
                                {availableOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        actionLabel="Pick Up Order"
                                        onAction={() => pickUpOrder(order.id)}
                                    />
                                ))}
                            </>
                        )}

                        {activeTab === "active" && (
                            <>
                                {myDeliveries.length === 0 && <p className="text-center text-muted-foreground py-8">No active deliveries.</p>}
                                {myDeliveries.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        actionLabel="Mark Delivered"
                                        onAction={() => markDelivered(order.id)}
                                        variant="active"
                                    />
                                ))}
                            </>
                        )}

                        {activeTab === "history" && (
                            <>
                                {deliveryHistory.length === 0 && <p className="text-center text-muted-foreground py-8">No delivery history found.</p>}
                                {deliveryHistory.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        actionLabel="Delivered"
                                        onAction={() => { }} // No action for history
                                        variant="history"
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </AuthGuard>
    )
}

function OrderCard({ order, actionLabel, onAction, variant = 'default' }: { order: Order, actionLabel: string, onAction: () => void, variant?: 'default' | 'active' | 'history' }) {
    const addressStr = typeof order.delivery_address === 'object'
        ? `${order.delivery_address.street || ''}, ${order.delivery_address.city || ''}`
        : order.delivery_address

    // Safety check for phone number
    const phone = order.contact_number || ''

    const handleCall = () => {
        if (!phone) return alert("No contact number available")
        window.location.href = `tel:${phone}`
    }

    const handleWhatsApp = () => {
        if (!phone) return alert("No contact number available")
        // Remove non-numeric chars for API
        const cleanPhone = phone.replace(/\D/g, '')
        const text = `Hi, I am your delivery partner from Champaran Meat House. I am on my way with your order #${order.id.slice(0, 6)}.`
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    const handleMap = () => {
        if (!addressStr) return alert("No address available")
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}`, '_blank')
    }

    return (
        <Card className="overflow-hidden border-none shadow-md">
            <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 6)}</span>
                        <h3 className="font-bold text-lg">₹{order.total_amount}</h3>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium capitalize">
                        {order.status.replace(/_/g, ' ')}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="flex-1">{addressStr}</span>
                    </div>
                    {phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{phone}</span>
                        </div>
                    )}
                </div>

                {/* Quick Actions (Visible mostly for active deliveries, but useful for pickup too to locate/call) */}
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleCall}>
                        <Phone className="h-3 w-3 mr-1" /> Call
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs text-green-600 hover:text-green-700 border-green-200 bg-green-50/50" onClick={handleWhatsApp}>
                        <MessageCircle className="h-3 w-3 mr-1" /> Chat
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs text-blue-600 hover:text-blue-700 border-blue-200 bg-blue-50/50" onClick={handleMap}>
                        <Navigation className="h-3 w-3 mr-1" /> Map
                    </Button>
                </div>

                <div className="pt-2 border-t border-dashed">
                    <p className="text-xs text-muted-foreground mb-2">Items:</p>
                    <ul className="text-sm space-y-1">
                        {order.order_items?.map((item: any, i: number) => (
                            <li key={i} className="flex justify-between">
                                <span>{item.menu_items?.name}</span>
                                <span className="font-medium">x{item.quantity}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-3">
                {variant === 'history' ? (
                    <div className="w-full text-center py-2 text-sm font-medium text-green-600 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Delivered on {new Date(order.created_at).toLocaleDateString()}
                    </div>
                ) : (
                    <Button className="w-full" size="lg" onClick={onAction}>
                        {variant === 'active' ? <CheckCircle className="w-4 h-4 mr-2" /> : <Package className="w-4 h-4 mr-2" />}
                        {actionLabel}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
