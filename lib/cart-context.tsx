"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { mockMenuItems } from "@/lib/mockData"

export interface CartItem {
    id: string
    menuItemId: string
    name: string
    price: number
    quantity: number
    image_url?: string
    variant?: string
}

interface CartContextType {
    items: CartItem[]
    addItem: (product: { id: string; name: string; price: number; image_url?: string; variant?: string }) => void
    removeItem: (cartItemId: string) => void
    removeOneByProductId: (menuItemId: string, variant?: string) => void
    clearCart: () => void
    totalItems: number
    totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isInitialized, setIsInitialized] = useState(false)

    // Load from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem("cart")
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart)) // eslint-disable-line react-hooks/set-state-in-effect
            } catch (e) {
                console.error("Failed to parse cart", e)
            }
        }
        setIsInitialized(true)
    }, [])

    // Save to local storage on change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem("cart", JSON.stringify(items))
        }
    }, [items, isInitialized])

    const addItem = (product: { id: string; name: string; price: number; image_url?: string; variant?: string }) => {
        setItems((prev) => {
            // Check if item with same ID AND same variant exists
            const existing = prev.find((i) => i.menuItemId === product.id && i.variant === product.variant)
            if (existing) {
                return prev.map((i) =>
                    (i.menuItemId === product.id && i.variant === product.variant) ? { ...i, quantity: i.quantity + 1 } : i
                )
            }

            return [
                ...prev,
                {
                    id: Math.random().toString(36).substr(2, 9),
                    menuItemId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    image_url: product.image_url,
                    variant: product.variant,
                },
            ]
        })
    }

    const removeItem = (cartItemId: string) => {
        setItems((prev) => {
            // Find by the unique cart item ID
            const existing = prev.find((i) => i.id === cartItemId)
            if (existing && existing.quantity > 1) {
                return prev.map((i) =>
                    i.id === cartItemId ? { ...i, quantity: i.quantity - 1 } : i
                )
            }
            return prev.filter((i) => i.id !== cartItemId)
        })
    }

    const removeOneByProductId = (menuItemId: string, variant?: string) => {
        setItems((prev) => {
            // Find the last added item with this menuItemId AND matching variant (if specified)
            const reversedIndex = [...prev].reverse().findIndex(i =>
                i.menuItemId === menuItemId && (variant ? i.variant === variant : true)
            );

            if (reversedIndex === -1) return prev;

            const index = prev.length - 1 - reversedIndex;
            const item = prev[index];

            if (item.quantity > 1) {
                const newItems = [...prev];
                newItems[index] = { ...item, quantity: item.quantity - 1 };
                return newItems;
            } else {
                // Remove the item entirely
                return prev.filter((_, i) => i !== index);
            }
        })
    }

    const clearCart = () => setItems([])

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
    const totalPrice = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, removeOneByProductId, clearCart, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider")
    }
    return context
}


