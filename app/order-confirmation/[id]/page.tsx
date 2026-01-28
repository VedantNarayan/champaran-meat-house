"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function OrderConfirmation() {
    const { id } = useParams()

    return (
        <div className="min-h-screen bg-muted/40">
            <Navbar />
            <main className="container px-4 py-20 text-center flex flex-col items-center">
                <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>

                <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
                <p className="text-muted-foreground mb-8 max-w-md">
                    Thank you for ordering. Your Order ID is <span className="font-mono text-foreground font-bold">#{Array.isArray(id) ? id[0].substr(0, 8) : id?.substr(0, 8)}</span>.
                    <br /> We have received your request and will start preparing your ahuna mutton shortly.
                </p>

                <div className="flex gap-4">
                    <Link href="/">
                        <Button variant="outline" className="rounded-full">Back to Menu</Button>
                    </Link>
                    {/* Future: Link to /track-order/{id} */}
                    <Link href={`/order-status/${id}`}>
                        <Button className="rounded-full">Track Order</Button>
                    </Link>
                </div>
            </main>
        </div>
    )
}
