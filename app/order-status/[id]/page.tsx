"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Navbar } from "@/components/layout/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, MapPin, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Interfaces
// ... imports
// Update Interface
interface OrderItem {
    id: string
    quantity: number
    price_at_order: number // Changed from price to price_at_order
    menu_item: {
        name: string
        image_url: string
    }
}

// ... existing code ...

// Status Steps
const STEPS = [
    { status: 'pending', label: 'Order Placed', icon: Clock },
    { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { status: 'preparing', label: 'Preparing', icon: Package },
    { status: 'ready', label: 'Kitchen Ready', icon: CheckCircle2 },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    { status: 'cancelled', label: 'Cancelled', icon: CheckCircle2 }, // Add cancelled step for logic
]

export default function OrderStatusPage() {
    const params = useParams()
    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<OrderItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrder = async () => {
            if (!params?.id) return

            try {
                // Fetch Order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', params.id)
                    .single()

                if (orderError) throw orderError
                setOrder(orderData)

                // Fetch Items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select(`
                        *,
                        menu_item:menu_items (
                            name,
                            image_url
                        )
                    `)
                    .eq('order_id', params.id)

                if (itemsError) throw itemsError
                setItems(itemsData || [])
            } catch (error) {
                console.error('Error fetching order:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()

        // Real-time subscription for status updates
        const channel = supabase
            .channel(`order_status_${params?.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${params?.id}`
                },
                (payload) => {
                    console.log('Realtime update received:', payload)
                    setOrder((prev: any) => ({ ...prev, ...payload.new }))
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to order updates')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [params?.id])

    if (loading) return <div className="min-h-screen bg-muted/40 grid place-items-center">Loading...</div>
    if (!order) return <div className="min-h-screen bg-muted/40 grid place-items-center">Order not found</div>

    const currentStepIndex = STEPS.findIndex(s => s.status === order.status)
    const isCancelled = order.status === 'cancelled'

    // Filter steps to hide 'Cancelled' unless it is actually cancelled
    const visibleSteps = isCancelled
        ? STEPS
        : STEPS.filter(s => s.status !== 'cancelled')

    // Format address helper
    const userAddress = typeof order.delivery_address === 'object'
        ? `${order.delivery_address.street || ''}, ${order.delivery_address.city || ''}`
        : order.delivery_address

    // Calculate Breakdown
    const subtotal = items.reduce((acc, item) => acc + (item.price_at_order * item.quantity), 0)
    const deliveryFee = 40
    const displaySubtotal = subtotal
    const displayTotal = order.total_amount

    // Cancel Order Handler
    const handleCancelOrder = async () => {
        // Confirmation is handled by AlertDialog UI

        // Optimistic Update
        const previousStatus = order.status
        setOrder((prev: any) => ({ ...prev, status: 'cancelled' }))

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', order.id)

            if (error) throw error

            // UI update will happen via subscription, but we already updated optimistically
        } catch (error) {
            console.error('Error canceling order:', error)
            alert('Failed to cancel order')
            // Revert optimistic update
            setOrder((prev: any) => ({ ...prev, status: previousStatus }))
        }
    }

    const canCancel = order.status === 'pending' || order.status === 'confirmed'

    return (
        <div className="min-h-screen bg-muted/40 pb-20">
            <Navbar />
            <main className="container max-w-3xl mx-auto py-10 px-4 space-y-8">
                {/* ... Title and Timeline ... */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Order Status</h1>
                    <p className="text-muted-foreground">Order ID: {order.id}</p>
                </div>

                {/* Status Timeline */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                        {isCancelled ? (
                            <div className="text-center text-destructive p-4 bg-destructive/10 rounded-lg">
                                <h3 className="font-bold text-lg">Order Cancelled</h3>
                                <p>Please contact support for assistance.</p>
                            </div>
                        ) : (
                            <div className="relative flex justify-between">
                                {/* Connector Line */}
                                <div className="absolute top-5 left-0 w-full h-1 bg-muted -z-0">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${(currentStepIndex / (visibleSteps.length - 1)) * 100}%` }}
                                    />
                                </div>

                                {visibleSteps.map((step, index) => {
                                    const Icon = step.icon
                                    const isActive = index <= currentStepIndex
                                    const isCurrent = index === currentStepIndex

                                    return (
                                        <div key={step.status} className="relative z-10 flex flex-col items-center group">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                                                isActive ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={cn(
                                                "mt-2 text-xs font-medium transition-colors duration-300",
                                                isActive ? "text-primary" : "text-muted-foreground",
                                                isCurrent && "font-bold"
                                            )}>
                                                {step.label}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Delivery & Price Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Delivery Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Address</h4>
                                <p>{userAddress}</p>
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₹{displaySubtotal}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Delivery Fee</span>
                                    <span>₹{deliveryFee}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                    <span>Total Amount</span>
                                    <span>₹{displayTotal}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center space-x-4">
                                    {item.menu_item?.image_url && (
                                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                                            <img
                                                src={item.menu_item.image_url}
                                                alt={item.menu_item?.name || 'Item'}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.menu_item?.name || 'Unknown Item'}</p>
                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-semibold text-sm">₹{item.price_at_order * item.quantity}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Cancel Action */}
                    {canCancel && !isCancelled && (
                        <div className="md:col-span-2 flex justify-center mt-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        className="px-6 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Cancel Order
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel This Order?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to cancel your order? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCancelOrder} className="bg-red-600 hover:bg-red-700">Yes, Cancel Order</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
