"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageSliderProps {
    images: string[]
    alt: string
    className?: string
}

export function ImageSlider({ images, alt, className }: ImageSliderProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0)

    // If no images or empty array, show placeholder
    if (!images || images.length === 0) {
        return (
            <div className={cn("w-full h-full bg-slate-200 flex items-center justify-center text-slate-400", className)}>
                No Image
            </div>
        )
    }

    const handlePrevious = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    }

    return (
        <div className={cn("relative w-full h-full overflow-hidden group", className)}>
            <img
                src={images[currentIndex] || "/Logo.jpeg"}
                alt={`${alt} - ${currentIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-500"
            />

            {images.length > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handlePrevious}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleNext}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors",
                                    idx === currentIndex ? "bg-white" : "bg-white/50"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
