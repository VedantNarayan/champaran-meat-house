"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VegNonVegFilterProps {
    currentFilter: 'all' | 'veg' | 'non-veg'
    onFilterChange: (filter: 'all' | 'veg' | 'non-veg') => void
    classname?: string
}

export function VegNonVegFilter({ currentFilter, onFilterChange, classname }: VegNonVegFilterProps) {
    return (
        <div className={cn("flex gap-2 bg-white/50 p-1 rounded-full border border-border/50", classname)}>
            <Button
                variant={currentFilter === 'all' ? "default" : "ghost"}
                size="sm"
                onClick={() => onFilterChange('all')}
                className="rounded-full px-4"
            >
                All
            </Button>
            <Button
                variant={currentFilter === 'veg' ? "default" : "ghost"}
                size="sm"
                onClick={() => onFilterChange('veg')}
                className={cn(
                    "rounded-full px-4",
                    currentFilter === 'veg' ? "bg-green-600 hover:bg-green-700" : "text-green-700 hover:text-green-800 hover:bg-green-50"
                )}
            >
                Veg
            </Button>
            <Button
                variant={currentFilter === 'non-veg' ? "default" : "ghost"}
                size="sm"
                onClick={() => onFilterChange('non-veg')}
                className={cn(
                    "rounded-full px-4",
                    currentFilter === 'non-veg' ? "bg-red-600 hover:bg-red-700" : "text-red-700 hover:text-red-800 hover:bg-red-50"
                )}
            >
                Non-Veg
            </Button>
        </div>
    )
}
