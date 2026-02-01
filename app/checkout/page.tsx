"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { Navbar } from "@/components/layout/Navbar"
import { useCart } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, MinusCircle } from "lucide-react"

export default function CheckoutPage() {
    const { items, totalPrice, clearCart } = useCart()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form and UI State
    const [showAlternatePhone, setShowAlternatePhone] = useState(false)
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        alternatePhone: "",
        street: "",
        city: "Patna", // Default city
        instructions: ""
    })

    // Fetch User Profile for Prefill
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setFormData(prev => ({
                        ...prev,
                        fullName: profile.full_name || prev.fullName,
                        phone_number: profile.phone_number || prev.phone
                    }))
                }

                // Fetch Saved Addresses
                const { data: addresses } = await supabase
                    .from('user_addresses')
                    .select('*')
                    .eq('user_id', user.id)

                if (addresses) {
                    setSavedAddresses(addresses)
                }
            }
        }
        fetchProfile()
    }, [])

    // Address Book State
    const [savedAddresses, setSavedAddresses] = useState<any[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

    const handleAddressSelect = (addressId: string) => {
        setSelectedAddressId(addressId)
        if (addressId === 'new') {
            setFormData({ ...formData, street: '', city: 'Patna' }) // Clear address fields
            return
        }

        const addr = savedAddresses.find(a => a.id === addressId)
        if (addr) {
            setFormData({
                ...formData,
                fullName: addr.full_name,
                phone: addr.phone_number,
                street: addr.street,
                city: addr.city
            })
        }
    }

    // Calculate total amount (Subtotal + Delivery)
    const deliveryFee = 40
    const finalAmount = totalPrice + deliveryFee

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-muted/40 text-center py-20">
                <h1 className="text-xl">Your cart is empty. Redirecting...</h1>
            </div>
        )
    }

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Create Order on Server (Razorpay)
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: finalAmount })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create order');

            // HANDLE MOCK MODE (For Development/Testing)
            if (data.id.startsWith('order_mock_')) {
                console.log("Mock Order detected, skipping Razorpay SDK");
                // Simulate a short delay for realism
                setTimeout(async () => {
                    await placeSupabaseOrder('pay_mock_' + Math.random().toString(36).substring(7));
                }, 1000);
                return;
            }

            // 2. Initialize Razorpay Options
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag', // Dummy Key Fallback
                amount: data.amount,
                currency: data.currency,
                name: "Champaran Meat House",
                description: "Delicious Food Order",
                order_id: data.id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    const verifyRes = await fetch('/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderCreationId: data.id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        })
                    });
                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok && verifyData.msg === 'success') {
                        await placeSupabaseOrder(response.razorpay_payment_id);
                    } else {
                        alert(verifyData.msg || 'Payment verification failed');
                        setLoading(false);
                    }
                },
                prefill: {
                    name: formData.fullName,
                    contact: formData.phone
                },
                theme: {
                    color: "#f97316" // Orange/Brand color
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.open();

        } catch (error: any) {
            console.error(error);
            alert("Payment failed: " + error.message);
            setLoading(false);
        }
    }

    const placeSupabaseOrder = async (paymentId: string) => {
        try {
            // Generate UUID client-side
            const orderId = crypto.randomUUID()
            const { data: { user } } = await supabase.auth.getUser()

            // Auto-save address if user is logged in
            if (user) {
                // Check if this exact address already exists to avoid duplicates
                const { data: existingAddresses } = await supabase
                    .from('user_addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('street', formData.street)
                    .eq('city', formData.city)

                if (!existingAddresses || existingAddresses.length === 0) {
                    await supabase.from('user_addresses').insert({
                        user_id: user.id,
                        full_name: formData.fullName,
                        phone_number: formData.phone,
                        street: formData.street,
                        city: formData.city,
                        is_default: false
                    })
                }
            }

            // Construct Delivery Address JSON
            // If alternate phone exists, use it as 'secondary_phone', otherwise just rely on main 'phone'
            const deliveryAddress = {
                fullName: formData.fullName,
                phone: formData.phone,
                secondary_phone: showAlternatePhone ? formData.alternatePhone : null,
                street: formData.street,
                city: formData.city,
                instructions: formData.instructions,
                paymentId: paymentId
            }

            const { error: orderError } = await supabase
                .from('orders')
                .insert({
                    id: orderId,
                    user_id: user?.id || null,
                    total_amount: finalAmount,
                    status: 'confirmed', // Ordered placed -> Confirmed (Skip pending for now as payment is verified)
                    delivery_address: deliveryAddress
                })

            if (orderError) throw orderError

            // Create Items
            const orderItems = items.map(item => ({
                order_id: orderId,
                menu_item_id: item.menuItemId,
                quantity: item.quantity,
                price_at_order: item.price
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            // 4. Trigger WhatsApp/Email Notification (Async - don't block UI)
            fetch('/api/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId })
            }).catch(err => console.error("Failed to send notification:", err));

            clearCart()
            router.push(`/order-confirmation/${orderId}`)
        } catch (error: any) {
            console.error("Supabase Error:", error);
            alert("Payment successful but order saving failed. Please contact support. ID: " + paymentId);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/40 pb-20">
            <Navbar />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <main className="container px-4 md:px-6 py-8 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-center">Checkout</h1>

                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Delivery Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {savedAddresses.length > 0 && (
                            <div className="mb-6 space-y-3">
                                <label className="text-sm font-medium">Select a Saved Address</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {savedAddresses.map((addr) => (
                                        <div
                                            key={addr.id}
                                            onClick={() => handleAddressSelect(addr.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedAddressId === addr.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-input hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-sm">{addr.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{addr.phone_number}</p>
                                                    <p className="text-xs mt-1">{addr.street}, {addr.city}</p>
                                                </div>
                                                {selectedAddressId === addr.id && (
                                                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                                        <div className="h-2 w-2 rounded-full bg-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div
                                        onClick={() => handleAddressSelect('new')}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${selectedAddressId === 'new'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-input hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedAddressId === 'new' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                            {selectedAddressId === 'new' && <div className="h-2 w-2 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-sm font-medium">Use a Different Address</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Full Name</label>
                                <input
                                    name="fullName" required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Phone Number</label>
                                <input
                                    name="phone" required type="tel"
                                    maxLength={10}
                                    minLength={10}
                                    pattern="\d{10}"
                                    title="Please enter a valid 10-digit phone number"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    placeholder="9876543210"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) setFormData({ ...formData, phone: val });
                                    }}
                                />
                            </div>

                            {/* Alternate Phone Logic */}
                            <div className="space-y-2">
                                {!showAlternatePhone ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowAlternatePhone(true)}
                                        className="text-sm text-primary flex items-center gap-1 hover:underline font-medium"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Add Alternate Phone Number
                                    </button>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium leading-none">Alternate Phone (Optional)</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAlternatePhone(false)
                                                    setFormData({ ...formData, alternatePhone: "" })
                                                }}
                                                className="text-xs text-destructive flex items-center gap-1 hover:underline"
                                            >
                                                <MinusCircle className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                        <input
                                            name="alternatePhone" type="tel"
                                            maxLength={10}
                                            minLength={10}
                                            pattern="\d{10}"
                                            title="Please enter a valid 10-digit phone number"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                            placeholder="Alternate Number"
                                            value={formData.alternatePhone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 10) setFormData({ ...formData, alternatePhone: val });
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Street Address</label>
                                <textarea
                                    name="street" required
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    placeholder="Flat / House No / Colony"
                                    value={formData.street}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₹{totalPrice}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Delivery Fee</span>
                                    <span>₹{deliveryFee}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total</span>
                                    <span>₹{finalAmount}</span>
                                </div>
                            </div>

                            <Button type="submit" className="w-full rounded-full h-12 text-md mt-4" disabled={loading}>
                                {loading ? "Processing..." : `Pay ₹${finalAmount}`}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

