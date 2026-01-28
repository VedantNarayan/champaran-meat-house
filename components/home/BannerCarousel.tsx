"use client"

import * as React from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface Banner {
    id: string
    image_url: string
    title: string
    link?: string
}

export function BannerCarousel() {
    const [banners, setBanners] = React.useState<Banner[]>([])
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchBanners() {
            try {
                const { data, error } = await supabase
                    .from('banners')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })

                if (!error && data && data.length > 0) {
                    setBanners(data)
                }
            } catch (e) {
                console.log("Banners table likely missing, using default", e)
            } finally {
                setLoading(false)
            }
        }
        fetchBanners()
    }, [])

    // Auto-slide
    React.useEffect(() => {
        if (banners.length <= 1) return
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [banners.length])

    // Fallback if no banners
    if (!loading && banners.length === 0) {
        return (
            <div className="relative h-[300px] w-full bg-slate-900 flex items-center justify-center overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-60" />
                <div className="relative z-10 text-center px-4">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg font-serif">
                        Champaran Meat House
                    </h2>
                    <p className="text-lg text-slate-100 max-w-xl mx-auto drop-shadow-md mb-6">
                        The authentic taste of Ahuna Mutton, strictly cooked in earthen pots.
                    </p>
                    <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-8">
                        Order Now
                    </Button>
                </div>
            </div>
        )
    }

    if (loading) return <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-xl" />

    return (
        <div className="relative h-[300px] w-full overflow-hidden rounded-xl shadow-lg border border-border/20 group">
            {banners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? "opacity-100" : "opacity-0"
                        }`}
                >
                    <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                        <div className="max-w-2xl text-white">
                            <h2 className="text-3xl md:text-4xl font-bold mb-2">{banner.title}</h2>
                            {banner.link && (
                                <Button variant="outline" className="text-white border-white hover:bg-white hover:text-black mt-2">
                                    Check it out <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, idx) => (
                    <button
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? "bg-white w-4" : "bg-white/50"
                            }`}
                        onClick={() => setCurrentIndex(idx)}
                    />
                ))}
            </div>
        </div>
    )
}
