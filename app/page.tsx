"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { supabase } from "@/lib/supabaseClient"
import { BannerCarousel } from "@/components/home/BannerCarousel"
import { RestaurantGallery } from "@/components/home/RestaurantGallery"
import { AboutSection } from "@/components/home/AboutSection"
import { VegNonVegFilter } from "@/components/menu/VegNonVegFilter"
import { ItemModal, Variant } from "@/components/menu/ItemModal"
import { cn } from "@/lib/utils"

interface Category {
  id: number
  name: string
  is_active: boolean
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  tags: string[]
  category_id: number
  is_available: boolean
  is_veg?: boolean
  variants?: Variant[]
  images?: string[]
}

export default function Home() {
  const { items: cartItems, removeOneByProductId } = useCart()
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [filterType, setFilterType] = useState<'all' | 'veg' | 'non-veg'>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        const { data: menuData } = await supabase
          .from('menu_items')
          .select('*')
        // .eq('is_available', true) // Fetch all to show Out of Stock

        if (categoriesData) setCategories(categoriesData)
        if (menuData) setMenuItems(menuData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredItems = menuItems.filter(item => {
    // 1. Category Filter
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false

    // 2. Veg/Non-Veg Filter
    if (filterType === 'veg' && item.is_veg === false) return false
    if (filterType === 'non-veg' && item.is_veg === true) return false

    return true
  })

  // Helper to get total quantity of an item in cart (across all variants)
  const getItemQuantity = (itemId: string) => {
    return cartItems
      .filter(cartItem => cartItem.menuItemId === itemId)
      .reduce((acc, curr) => acc + curr.quantity, 0)
  }

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40 pb-20">
        <Navbar />
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground animate-pulse">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero / Banners */}
      <div className="container px-4 md:px-6 py-6">
        <BannerCarousel />
      </div>

      {/* Menu Section */}
      <main className="container px-4 md:px-6 py-2 pb-12">

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 sticky top-16 z-40 bg-background/95 backdrop-blur py-2 border-b">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
            <Button
              variant={selectedCategory === 'all' ? "default" : "secondary"}
              className="rounded-full h-8 text-xs"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "secondary"}
                className="rounded-full whitespace-nowrap h-8 text-xs"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Veg/Non-Veg Filter */}
          <VegNonVegFilter
            currentFilter={filterType}
            onFilterChange={setFilterType}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const qty = getItemQuantity(item.id)
            return (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden hover:shadow-xl transition-all duration-300 border-none ring-1 ring-border/50 group cursor-pointer",
                  !item.is_available && "opacity-75 grayscale-[0.5]"
                )}
                onClick={() => handleItemClick(item)}
              >
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-500",
                      item.is_available ? "group-hover:scale-105" : "grayscale"
                    )}
                  />
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <span className="bg-red-600/90 text-white px-3 py-1 font-bold uppercase tracking-widest text-sm rounded shadow-lg transform -rotate-2">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20">
                    {/* Veg/Non-Veg Indicator */}
                    <span className={cn(
                      "h-4 w-4 border flex items-center justify-center bg-white rounded-sm",
                      item.is_veg ? "border-green-600" : "border-red-600"
                    )}>
                      <span className={cn("h-2 w-2 rounded-full", item.is_veg ? "bg-green-600" : "bg-red-600")} />
                    </span>

                    {item.tags && item.tags.length > 0 && item.tags.map(tag => (
                      <span key={tag} className="bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Quick Counter Overlay if in cart */}
                  {qty > 0 && (
                    <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      {qty} in cart
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs line-clamp-2 mb-4 h-8">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-lg">
                      {item.variants && item.variants.length > 0
                        ? `From ₹${Math.min(...item.variants.map(v => v.price))}`
                        : `₹${item.price}`}
                    </span>
                    {qty > 0 ? (
                      <div className="flex items-center gap-2 bg-secondary text-white rounded-full px-2 h-8" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:text-white hover:bg-white/20 rounded-full"
                          onClick={() => removeOneByProductId(item.id)}
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:text-white hover:bg-white/20 rounded-full"
                          onClick={() => handleItemClick(item)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!item.is_available}
                        className={cn(
                          "rounded-full px-4 h-8 transition-colors",
                          item.is_available
                            ? "bg-secondary/10 text-secondary hover:bg-secondary hover:text-white"
                            : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                        )}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          if (item.is_available) handleItemClick(item);
                        }}
                      >
                        {item.is_available ? <><Plus className="h-4 w-4 mr-1" /> Add</> : "Unavailable"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      <RestaurantGallery />
      <AboutSection />

      {/* Item Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
      />
    </div>
  )
}
