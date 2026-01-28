"use client"

import { Navbar } from "@/components/layout/Navbar"
import { useCart } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Minus, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function CartPage() {
    const { items, addItem, removeItem, totalPrice } = useCart()

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-muted/40">
                <Navbar />
                <main className="container px-4 py-20 text-center">
                    <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                    <p className="text-muted-foreground mb-8">Looks like you haven't added any authentic dishes yet.</p>
                    <Link href="/">
                        <Button size="lg" className="rounded-full">Browse Menu</Button>
                    </Link>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/40 pb-20">
            <Navbar />

            <main className="container px-4 md:px-6 py-8 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Your Order</h1>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Cart Items List */}
                    <div className="md:col-span-2 space-y-4">
                        {items.map((item) => (
                            <Card key={item.id} className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
                                <CardContent className="p-4 flex gap-4 items-center">
                                    {item.image_url && (
                                        <img src={item.image_url} alt={item.name} className="h-20 w-20 object-cover rounded-lg" />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                                        <p className="text-muted-foreground text-sm">₹{item.price}</p>
                                        {item.variant && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm mt-1 inline-block">{item.variant}</span>}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline" size="icon" className="h-8 w-8 rounded-full"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="font-medium w-4 text-center">{item.quantity}</span>
                                        <Button
                                            variant="outline" size="icon" className="h-8 w-8 rounded-full"
                                            onClick={() => addItem({ id: item.menuItemId, name: item.name, price: item.price, image_url: item.image_url })}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Checkout Summary */}
                    <div className="md:col-span-1">
                        <Card className="sticky top-24 border-none shadow-md">
                            <CardContent className="p-6">
                                <CardTitle className="text-lg mb-4">Summary</CardTitle>
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>₹{totalPrice}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Delivery</span>
                                        <span>₹40</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>₹{totalPrice + 40}</span>
                                    </div>
                                </div>
                                <Link href="/checkout">
                                    <Button className="w-full rounded-full py-6 text-md bg-green-600 hover:bg-green-700">
                                        Proceed to Checkout
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
