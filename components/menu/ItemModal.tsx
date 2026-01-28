"use client"

import * as React from "react"
import { X, Plus, Minus, Star, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { useCart } from "@/lib/cart-context"
import { ImageSlider } from "@/components/ui/image-slider"
import { supabase } from "@/lib/supabaseClient"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

export interface Variant {
    size: string
    price: number
}

interface ItemModalProps {
    isOpen: boolean
    onClose: () => void
    item: {
        id: string
        name: string
        description: string
        price: number
        image_url: string
        images?: string[]
        variants?: Variant[]
        tags?: string[]
        is_available?: boolean
    } | null
}

interface Review {
    id: string
    rating: number
    comment: string
    created_at: string
    profiles: {
        full_name: string
    }
}

export function ItemModal({ isOpen, onClose, item }: ItemModalProps) {
    const { addItem, items, removeOneByProductId } = useCart()
    const [selectedVariant, setSelectedVariant] = React.useState<Variant | null>(null)
    const [reviews, setReviews] = React.useState<Review[]>([])
    const [ratingStats, setRatingStats] = React.useState({ average: 0, count: 0 })

    // Reset state when item opens
    React.useEffect(() => {
        if (isOpen && item) {
            // Default to first variant if available, else null (base price)
            if (item.variants && item.variants.length > 0) {
                setSelectedVariant(item.variants[0])
            } else {
                setSelectedVariant(null)
            }

            fetchReviews(item.id)
        }
    }, [isOpen, item])

    const fetchReviews = async (itemId: string) => {
        // Determine if table exists before trying (for seamless migration)
        // We'll just try-catch the select
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          id, rating, comment, created_at,
          profiles (full_name)
        `)
                .eq('menu_item_id', itemId)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) throw error

            if (data) {
                // Supabase join return type casting
                const reviewsData = data as unknown as Review[]
                setReviews(reviewsData)

                // Calculate stats
                const total = reviewsData.reduce((acc: number, curr: Review) => acc + curr.rating, 0)
                setRatingStats({
                    average: data.length > 0 ? total / data.length : 0,
                    count: data.length
                })
            }
        } catch (e) {
            // Table might not exist yet or no reviews
            console.log("No reviews found or table missing", e)
            setReviews([])
            setRatingStats({ average: 0, count: 0 })
        }
    }

    if (!item) return null

    // Determine current display price
    const currentPrice = selectedVariant ? selectedVariant.price : item.price

    // Combine main image with slider images if they exist
    // Ensure main image is first
    const displayImages = item.images && item.images.length > 0
        ? [item.image_url, ...item.images.filter(img => img !== item.image_url)]
        : [item.image_url]

    const handleAddToCart = () => {
        addItem({
            id: item.id,
            name: item.name,
            price: currentPrice,
            image_url: item.image_url,
            variant: selectedVariant?.size
        })
        // Optional: Close modal or show toast
        // onClose() 
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-background max-h-[90vh] flex flex-col md:flex-row gap-0">
                <DialogTitle className="sr-only">{item.name}</DialogTitle>

                {/* Left: Images */}
                <div className="w-full md:w-1/2 h-[300px] md:h-auto relative bg-slate-100">
                    <ImageSlider images={displayImages} alt={item.name} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 md:hidden bg-black/20 text-white rounded-full"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Right: Content */}
                <div className="w-full md:w-1/2 p-6 flex flex-col h-full overflow-y-auto max-h-[60vh] md:max-h-[600px]">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-2xl font-bold font-serif">{item.name}</h2>
                            {item.tags && (
                                <div className="flex gap-2 mt-1 flex-wrap">
                                    {item.tags.map(tag => (
                                        <span key={tag} className="text-[10px] uppercase font-bold tracking-wider bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <DialogClose className="hidden md:flex">
                            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        </DialogClose>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                        {item.description}
                    </p>

                    {/* Variants */}
                    {item.variants && item.variants.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold mb-3">Select Quantity</h3>
                            <div className="flex flex-wrap gap-2">
                                {item.variants.map((v) => (
                                    <button
                                        key={v.size}
                                        onClick={() => setSelectedVariant(v)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-between min-w-[120px]",
                                            selectedVariant?.size === v.size
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-primary/50 text-muted-foreground"
                                        )}
                                    >
                                        <span>{v.size}</span>
                                        <span className="ml-2 font-bold">₹{v.price}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Price & Add to Cart */}
                    <div className="mt-auto pt-4 border-t border-dashed">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Price</p>
                                <p className="text-3xl font-bold text-primary">₹{currentPrice}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {(() => {
                                    const qty = items
                                        .filter(i => i.menuItemId === item.id && i.variant === selectedVariant?.size)
                                        .reduce((acc, i) => acc + i.quantity, 0);

                                    if (qty > 0) {
                                        return (
                                            <div className="flex items-center gap-4 bg-background border px-2 py-1 rounded-full shadow-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
                                                    onClick={() => removeOneByProductId(item.id, selectedVariant?.size)}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="font-bold text-lg min-w-[20px] text-center">{qty}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
                                                    onClick={handleAddToCart}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    }
                                    if (!item.is_available) {
                                        return (
                                            <Button size="lg" disabled className="rounded-full px-8 opacity-50 cursor-not-allowed">
                                                Currently Unavailable
                                            </Button>
                                        )
                                    }
                                    return (
                                        <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20" onClick={handleAddToCart}>
                                            <ShoppingBag className="mr-2 h-5 w-5" /> Add to Cart
                                        </Button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="mt-8 pt-6 border-t">
                        <h3 className="font-semibold mb-4 flex items-center">
                            Customer Reviews
                            <span className="ml-2 text-xs font-normal text-muted-foreground">({ratingStats.count})</span>
                        </h3>

                        {reviews.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No reviews yet. Be the first to try!</p>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="bg-muted/30 p-3 rounded-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium">{review.profiles?.full_name || 'Guest'}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <div className="flex text-yellow-500 mb-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={cn("h-3 w-3", i < review.rating ? "fill-current" : "text-gray-300")} />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-600">{review.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
