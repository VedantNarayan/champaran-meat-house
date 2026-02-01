"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react"

interface GalleryImage {
    id: string
    image_url: string
    alt_text: string | null
}

export function RestaurantGallery() {
    const [images, setImages] = useState<GalleryImage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

    // Fallback images in case the database is empty (optional, for demo continuity)
    const fallbackImages = [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80",
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80",
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80"
    ]

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const { data } = await supabase
                    .from('gallery_images')
                    .select('id, image_url, alt_text')
                    .eq('is_active', true)
                    .order('sort_order')

                if (data && data.length > 0) {
                    setImages(data)
                } else {
                    // Decide whether to show fallback or nothing. 
                    // Showing fallback so the UI doesn't look broken initially.
                    // Ideally, the admin would populate this.
                    // To signal it's fallback, we'll map strings to objects
                    setImages(fallbackImages.map((url, i) => ({
                        id: `fallback-${i}`,
                        image_url: url,
                        alt_text: "Restaurant Ambience"
                    })))
                }
            } catch (error) {
                console.error("Error fetching gallery:", error)
                // Fallback on error
                setImages(fallbackImages.map((url, i) => ({
                    id: `fallback-${i}`,
                    image_url: url,
                    alt_text: "Restaurant Ambience"
                })))
            } finally {
                setLoading(false)
            }
        }
        fetchImages()
    }, [])

    if (loading) {
        return (
            <section className="py-12 bg-white">
                <div className="flex justify-center items-center h-[200px]">
                    <Loader2 className="animate-spin text-primary h-8 w-8" />
                </div>
            </section>
        )
    }

    if (images.length === 0) return null

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!selectedImage) return
        const currentIndex = images.findIndex(img => img.id === selectedImage.id)
        const nextIndex = (currentIndex + 1) % images.length
        setSelectedImage(images[nextIndex])
    }

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!selectedImage) return
        const currentIndex = images.findIndex(img => img.id === selectedImage.id)
        const prevIndex = (currentIndex - 1 + images.length) % images.length
        setSelectedImage(images[prevIndex])
    }

    return (
        <section className="py-12 bg-white">
            <div className="container px-4 md:px-6">
                <h2 className="text-2xl font-bold mb-6 text-center font-serif">Experience Our Ambience</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="aspect-square relative overflow-hidden rounded-lg shadow-md group cursor-pointer"
                            onClick={() => setSelectedImage(img)}
                        >
                            <img
                                src={img.image_url}
                                alt={img.alt_text || "Restaurant Ambience"}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {/* Overlay icon to hint clickable */}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">View</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="h-8 w-8" />
                    </button>

                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors hidden md:block"
                        onClick={handlePrev}
                    >
                        <ChevronLeft className="h-10 w-10" />
                    </button>

                    <div
                        className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={selectedImage.image_url}
                            alt={selectedImage.alt_text || "Gallery Image"}
                            className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl"
                        />
                    </div>

                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors hidden md:block"
                        onClick={handleNext}
                    >
                        <ChevronRight className="h-10 w-10" />
                    </button>
                </div>
            )}
        </section>
    )
}
