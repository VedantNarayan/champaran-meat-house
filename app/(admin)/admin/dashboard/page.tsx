"use client"

import { useSearchParams } from "next/navigation"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCcw, LayoutDashboard, UtensilsCrossed, Calendar as CalendarIcon, Image as ImageIcon, Trash2, ExternalLink, Plus, Minus, ArrowUp, ArrowDown, User, Edit, Search, Loader2, Save, X, Settings, ChevronDown, ChevronUp } from "lucide-react"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts"
import { startOfDay, endOfDay, subDays, subMonths, subYears, isWithinInterval, parseISO, format } from "date-fns"
import Image from "next/image"
import { uploadImage } from "@/lib/storage"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { MfaSettings } from "@/components/admin/MfaSettings"
import { WhatsAppSettings } from "@/components/admin/WhatsAppSettings"

// --- Types ---
interface Order {
    id: string
    created_at: string
    status: string
    total_amount: number
    delivery_address: any
    user_id: string | null
    items?: any[]
}

interface MenuItem {
    id: string
    name: string
    price: number
    is_available: boolean
    image_url: string
    category_id: number
    sort_order: number // Added sort_order
}

interface Banner {
    id: string
    image_url: string
    link?: string
    is_active: boolean
    sort_order: number
}

interface GalleryImage {
    id: string
    image_url: string
    alt_text: string | null
    is_active: boolean
    sort_order: number
}

interface DriverProfile {
    id: string
    full_name: string | null
    email?: string // Join from auth if possible, or just profile fields
    phone_number: string | null
    role: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get('tab') as 'overview' | 'menu' | 'banners' | 'drivers' | 'gallery' | 'settings' | null
    const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'banners' | 'drivers' | 'gallery' | 'settings'>(initialTab || 'overview')


    // --- Data State ---
    const [orders, setOrders] = useState<Order[]>([])
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [banners, setBanners] = useState<Banner[]>([])
    const [categories, setCategories] = useState<any[]>([]) // Should ideally type this
    const [drivers, setDrivers] = useState<DriverProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [menuLoading, setMenuLoading] = useState(false)
    const [bannerLoading, setBannerLoading] = useState(false)
    const [driverLoading, setDriverLoading] = useState(false)

    // --- Form State ---
    const [newBanner, setNewBanner] = useState({ image_url: '', link: '' })
    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_veg: true,
        tags: '',
        variants: [] as { size: string, price: string }[]
    })
    const [isAddingItem, setIsAddingItem] = useState(false) // Toggle form
    const [isManagingCategories, setIsManagingCategories] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingCategory, setEditingCategory] = useState<{ id: number, name: string } | null>(null)
    const [expandedCategories, setExpandedCategories] = useState<number[]>([])

    // --- Filter State ---
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    })
    const [filterLabel, setFilterLabel] = useState("Last 30 Days")
    // --- Driver Form State ---
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false)
    const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null)
    const [driverFormData, setDriverFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        phone_number: ''
    })

    // --- Fetchers ---
    const fetchOrders = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        const { data } = await supabase
            .from('orders')
            .select(`*, order_items (quantity, price_at_order, menu_items (name))`)
            .order('created_at', { ascending: false })

        if (data) setOrders(data as any)
        if (showLoading) setLoading(false)
    }

    const fetchMenu = async () => {
        setMenuLoading(true)
        const { data } = await supabase
            .from('menu_items')
            .select('*')
            .eq('is_deleted', false) // Filter out deleted items
            .order('sort_order', { ascending: true }) // Sort by sort_order first
            .order('name', { ascending: true })

        if (data) setMenuItems(data as any)
        setMenuLoading(false)
    }

    const fetchBanners = async () => {
        setBannerLoading(true)
        const { data } = await supabase
            .from('banners')
            .select('*')
            .order('sort_order', { ascending: true })

        if (data) setBanners(data as any)
        setBannerLoading(false)
    }

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
        if (data) setCategories(data)
    }

    const fetchDrivers = async () => {
        setDriverLoading(true)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'driver')
            .order('created_at', { ascending: false })

        if (data) setDrivers(data as any)
        setDriverLoading(false)
    }

    useEffect(() => {
        fetchOrders()
        fetchMenu() // Fetch menu initially too
        fetchBanners()
        fetchCategories()
        fetchDrivers()

        // Realtime Subscriptions
        const orderSub = supabase.channel('admin-dashboard-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // New order needs full join data, so we fetch
                    fetchOrders(false)
                } else if (payload.eventType === 'UPDATE') {
                    // Update existing order in place to avoid race conditions with optimistic updates
                    setOrders((prev) => prev.map((order) =>
                        order.id === payload.new.id
                            ? { ...order, ...payload.new }
                            : order
                    ))
                } else if (payload.eventType === 'DELETE') {
                    setOrders((prev) => prev.filter((order) => order.id !== payload.old.id))
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(orderSub) }
    }, [])

    // --- Menu Actions ---
    const toggleAvailability = async (id: string, currentStatus: boolean) => {
        // Optimistic Update
        setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))

        const { error } = await supabase
            .from('menu_items')
            .update({ is_available: !currentStatus })
            .eq('id', id)

        if (error) {
            console.error("Failed to update menu item:", error)
            alert(`Error updating menu: ${error.message}`) // Add alert for visibility
            fetchMenu() // Revert on error
        }
    }

    const updateStatus = async (orderId: string, newStatus: string) => {
        // Optimistic UI
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)

        if (error) {
            console.error(error)
            fetchOrders() // Revert
        }
    }

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price || !newItem.category_id) return alert("Please fill required fields")

        const variantsFormatted = newItem.variants
            .filter(v => v.size && v.price)
            .map(v => ({ size: v.size, price: parseFloat(v.price) }))

        const payload: any = {
            name: newItem.name,
            description: newItem.description,
            price: parseFloat(newItem.price),
            category_id: parseInt(newItem.category_id),
            image_url: newItem.image_url,
            is_veg: newItem.is_veg,
            tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean),
            is_available: true,
            variants: variantsFormatted.length > 0 ? variantsFormatted : null,
            sort_order: menuItems.length + 1 // Add at end
        }

        const { error } = await supabase.from('menu_items').insert([payload])

        if (error) {
            alert(error.message)
        } else {
            setNewItem({
                name: '', description: '', price: '', category_id: '',
                image_url: '', is_veg: true, tags: '', variants: []
            })
            setIsAddingItem(false)
            fetchMenu()
        }
    }

    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return
        const { error } = await supabase.from('menu_items').update({ is_deleted: true }).eq('id', id)

        if (error) {
            console.error(error)
            alert(error.message)
        } else {
            setMenuItems(prev => prev.filter(i => i.id !== id)) // Optimistic update
        }
    }

    const moveMenuItem = async (id: string, direction: 'up' | 'down') => {
        const index = menuItems.findIndex(i => i.id === id)
        if (index === -1) return
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === menuItems.length - 1) return

        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const currentItem = menuItems[index]
        const targetItem = menuItems[targetIndex]

        // Swap sort_order
        const currentOrder = currentItem.sort_order || 0
        const targetOrder = targetItem.sort_order || 0

        const newItems = [...menuItems]
        // Swap locally for instant update
        // We'll simplisticly swap indices, but relying on sort_order is better
        // Let's assume sort_order is populated. If not, fallback to index?
        // Let's assign temporary sort_orders if 0:
        // Actually, let's just swap the sort_orders we have.

        // DB Update
        const { error: err1 } = await supabase.from('menu_items').update({ sort_order: targetOrder }).eq('id', currentItem.id)
        const { error: err2 } = await supabase.from('menu_items').update({ sort_order: currentOrder }).eq('id', targetItem.id)

        if (err1 || err2) {
            console.error(err1, err2)
            alert("Error moving item")
        }
        fetchMenu() // Refresh to be safe
    }

    // --- Banner Actions ---
    const handleAddBanner = async () => {
        if (!newBanner.image_url) return alert("Image URL is required")

        const { error } = await supabase.from('banners').insert([{
            image_url: newBanner.image_url,
            link: newBanner.link,
            is_active: true,
            sort_order: banners.length + 1
        }])

        if (error) {
            alert(error.message)
        } else {
            setNewBanner({ image_url: '', link: '' })
            fetchBanners()
        }
    }

    const handleDeleteBanner = async (id: string) => {
        if (!confirm("Are you sure you want to delete this banner?")) return
        const { error } = await supabase.from('banners').delete().eq('id', id)
        if (error) alert(error.message)
        else fetchBanners()
    }

    const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b))
        await supabase.from('banners').update({ is_active: !currentStatus }).eq('id', id)
    }

    const moveBanner = async (id: string, direction: 'up' | 'down') => {
        const index = banners.findIndex(b => b.id === id)
        if (index === -1) return
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === banners.length - 1) return

        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const currentBanner = banners[index]
        const targetBanner = banners[targetIndex]

        // Swap sort_order values
        const currentOrder = currentBanner.sort_order
        const targetOrder = targetBanner.sort_order

        // Optimistic UI Update
        const newBanners = [...banners]
        newBanners[index] = { ...currentBanner, sort_order: targetOrder }
        newBanners[targetIndex] = { ...targetBanner, sort_order: currentOrder }

        // Re-sort array based on new sort_orders to reflect change immediately
        newBanners.sort((a, b) => a.sort_order - b.sort_order)
        setBanners(newBanners)

        // DB Update
        const { error: err1 } = await supabase.from('banners').update({ sort_order: targetOrder }).eq('id', currentBanner.id)
        const { error: err2 } = await supabase.from('banners').update({ sort_order: currentOrder }).eq('id', targetBanner.id)

        if (err1 || err2) {
            console.error("Error reordering banners", err1, err2)
            fetchBanners() // Revert
        }
    }

    // --- Category Actions ---
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return alert("Category name is required")
        const { error } = await supabase.from('categories').insert([{
            name: newCategoryName,
            sort_order: categories.length + 1,
            is_active: true
        }])
        if (error) alert(error.message)
        else {
            setNewCategoryName('')
            fetchCategories()
        }
    }

    const handleUpdateCategory = async () => {
        if (!editingCategory || !editingCategory.name.trim()) return
        const { error } = await supabase.from('categories').update({ name: editingCategory.name }).eq('id', editingCategory.id)
        if (error) alert(error.message)
        else {
            setEditingCategory(null)
            fetchCategories()
        }
    }

    const handleDeleteCategory = async (id: number) => {
        // 1. Check if category is used
        // Ensure id mismatch isn't the issue (num vs string)
        const hasItems = menuItems.some(item => Number(item.category_id) === Number(id))

        if (hasItems) {
            toast.error("Category is not empty, can't be deleted")
            return
        }

        if (!confirm("Are you sure you want to delete this category?")) return

        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) {
            console.error("Delete category error:", JSON.stringify(error, null, 2))
            toast.error(error.message || "Failed to delete category")
        } else {
            toast.success("Category deleted successfully")
            fetchCategories()
        }
    }

    const moveCategory = async (id: number, direction: 'up' | 'down') => {
        const index = categories.findIndex(c => c.id === id)
        if (index === -1) return
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === categories.length - 1) return

        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const currentCat = categories[index]
        const targetCat = categories[targetIndex]

        // Swap sort_order
        const currentOrder = currentCat.sort_order
        const targetOrder = targetCat.sort_order

        const newCats = [...categories]
        newCats[index] = { ...currentCat, sort_order: targetOrder }
        newCats[targetIndex] = { ...targetCat, sort_order: currentOrder }
        newCats.sort((a, b) => a.sort_order - b.sort_order)
        setCategories(newCats)

        const { error: err1 } = await supabase.from('categories').update({ sort_order: targetOrder }).eq('id', currentCat.id)
        const { error: err2 } = await supabase.from('categories').update({ sort_order: currentOrder }).eq('id', targetCat.id)
        if (err1 || err2) fetchCategories()
    }

    // --- Date Filter Logic ---
    const setPreset = (days: number | 'year' | '6months' | 'today') => {
        const end = new Date()
        let start = new Date()

        if (days === 'today') start = startOfDay(new Date())
        else if (days === 'year') start = subYears(new Date(), 1)
        else if (days === '6months') start = subMonths(new Date(), 6)
        else if (typeof days === 'number') start = subDays(new Date(), days)

        setDateRange({
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd')
        })

        // Update Label
        const labels: Record<string, string> = {
            today: "Today",
            7: "Last 7 Days",
            30: "Last 30 Days",
            '6months': "Last 6 Months",
            'year': "Last Year"
        }
        setFilterLabel(labels[days.toString()] || "Custom Range")
    }

    // --- Derived Data (Overview) ---
    const filteredOrders = useMemo(() => {
        const start = startOfDay(parseISO(dateRange.start))
        const end = endOfDay(parseISO(dateRange.end))
        return orders.filter(o => isWithinInterval(new Date(o.created_at), { start, end }))
    }, [orders, dateRange])

    const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total_amount : 0), 0)

    // Status Distribution
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredOrders.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1)
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [filteredOrders])

    // Revenue Trend
    const chartData = useMemo(() => {
        const map = new Map<string, number>()
        filteredOrders.forEach(o => {
            if (o.status === 'cancelled') return
            const key = format(new Date(o.created_at), 'MMM dd') // Simple grouping
            map.set(key, (map.get(key) || 0) + o.total_amount)
        })
        return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }))
        // Note: For a real app, we'd ensure chronological sorting here
    }, [filteredOrders])


    // --- Render ---
    return (
        <div className="space-y-8 p-8 max-w-[1400px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">Executive Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage your business performance and menu.</p>
                </div>

                {/* Tabs Switcher */}
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
                            }`}
                    >
                        <LayoutDashboard size={16} /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'menu' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
                            }`}
                    >
                        <UtensilsCrossed size={16} /> Menu Manager
                    </button>
                    <button
                        onClick={() => setActiveTab('banners')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'banners' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
                            }`}
                    >
                        <ImageIcon size={16} /> Banners
                    </button>
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'gallery' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
                            }`}
                    >
                        <ImageIcon size={16} /> Gallery
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
                            }`}
                    >
                        <Settings size={16} /> Settings
                    </button>
                </div>
            </div>

            {/* Content: Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Date Filters */}
                    <Card className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold mr-2 flex items-center gap-2">
                                <CalendarIcon size={16} /> Filter: {filterLabel}
                            </span>
                            <div className="h-6 w-px bg-border mx-2 hidden md:block"></div>

                            <Button variant="outline" size="sm" onClick={() => setPreset('today')} className={filterLabel === "Today" ? "bg-primary/10 border-primary" : ""}>Today</Button>
                            <Button variant="outline" size="sm" onClick={() => setPreset(7)} className={filterLabel === "Last 7 Days" ? "bg-primary/10 border-primary" : ""}>Last 7 Days</Button>
                            <Button variant="outline" size="sm" onClick={() => setPreset(30)} className={filterLabel === "Last 30 Days" ? "bg-primary/10 border-primary" : ""}>Last 30 Days</Button>
                            <Button variant="outline" size="sm" onClick={() => setPreset('6months')} className={filterLabel === "Last 6 Months" ? "bg-primary/10 border-primary" : ""}>Last 6 Months</Button>
                            <Button variant="outline" size="sm" onClick={() => setPreset('year')} className={filterLabel === "Last Year" ? "bg-primary/10 border-primary" : ""}>Last Year</Button>

                            <div className="flex items-center gap-2 ml-auto bg-muted/50 p-1 rounded border">
                                <span className="text-xs text-muted-foreground pl-2">Custom:</span>
                                <input type="date" value={dateRange.start} onChange={(e) => { setDateRange(p => ({ ...p, start: e.target.value })); setFilterLabel("Custom Range") }} className="bg-transparent text-xs p-1" />
                                <span className="text-muted-foreground">-</span>
                                <input type="date" value={dateRange.end} onChange={(e) => { setDateRange(p => ({ ...p, end: e.target.value })); setFilterLabel("Custom Range") }} className="bg-transparent text-xs p-1" />
                            </div>
                        </div>
                    </Card>

                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">Total Revenue</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div></CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">Active Orders</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {orders.filter(o => ['pending', 'preparing', 'out_for_delivery'].includes(o.status)).length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-600">Total Orders</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{filteredOrders.length}</div></CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-600">Inventory Status</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">{menuItems.filter(i => i.is_available).length}</div>
                                        <div className="text-xs text-muted-foreground">In Stock</div>
                                    </div>
                                    <div className="mx-2 h-8 w-px bg-border"></div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-600">{menuItems.filter(i => !i.is_available).length}</div>
                                        <div className="text-xs text-muted-foreground">Out of Stock</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                                        <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Order Statuses</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {statusData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Orders */}
                    <Card>
                        <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredOrders.slice(0, 10).map(order => (
                                    <div key={order.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="mb-2 sm:mb-0">
                                            <div className="font-semibold">#{order.id.slice(0, 8)}</div>
                                            <div className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                                            <div className="mt-1 text-sm font-medium">₹{order.total_amount} • {order.items?.length || 0} items</div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize 
                                                ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-blue-100 text-blue-700'}`}>
                                                {order.status.replace('_', ' ')}
                                            </span>

                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                                className="bg-background border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="preparing">Preparing</option>
                                                <option value="ready">Ready (for Driver)</option>
                                                <option value="out_for_delivery">Out for Delivery</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Content: Drivers Tab */}
            {activeTab === 'drivers' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Driver Management</h2>
                        <Button onClick={() => {
                            setEditingDriver(null)
                            setDriverFormData({ full_name: '', email: '', password: '', phone_number: '' })
                            setIsDriverModalOpen(true)
                        }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Driver
                        </Button>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Registered Drivers</CardTitle></CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Phone</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Role</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {drivers.map((driver) => (
                                            <tr key={driver.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-4 align-middle font-medium">{driver.full_name || 'N/A'}</td>
                                                <td className="p-4 align-middle">{driver.phone_number || 'N/A'}</td>
                                                <td className="p-4 align-middle capitalize">{driver.role}</td>
                                                <td className="p-4 align-middle text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setEditingDriver(driver)
                                                        setDriverFormData({
                                                            full_name: driver.full_name || '',
                                                            phone_number: driver.phone_number || '',
                                                            email: '', // Can't edit email easily solely via profile
                                                            password: ''
                                                        })
                                                        setIsDriverModalOpen(true)
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {drivers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-muted-foreground">No drivers found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Driver Modal */}
                    <Dialog open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                                <DialogDescription>
                                    {editingDriver ? 'Update driver details.' : 'Create a new driver account. They will use these credentials to login.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        value={driverFormData.full_name}
                                        onChange={(e) => setDriverFormData({ ...driverFormData, full_name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        value={driverFormData.phone_number}
                                        maxLength={10}
                                        minLength={10}
                                        type="tel"
                                        pattern="\d{10}"
                                        title="Phone number must be exactly 10 digits"
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10) setDriverFormData({ ...driverFormData, phone_number: val });
                                        }}
                                        placeholder="9876543210"
                                    />
                                </div>
                                {!editingDriver && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input
                                                value={driverFormData.email}
                                                onChange={(e) => setDriverFormData({ ...driverFormData, email: e.target.value })}
                                                placeholder="driver@example.com"
                                                type="email"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password</Label>
                                            <Input
                                                value={driverFormData.password}
                                                onChange={(e) => setDriverFormData({ ...driverFormData, password: e.target.value })}
                                                placeholder="******"
                                                type="password"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDriverModalOpen(false)}>Cancel</Button>
                                <Button onClick={async () => {
                                    try {
                                        setDriverLoading(true)
                                        if (editingDriver) {
                                            // Update existing
                                            const { error } = await supabase
                                                .from('profiles')
                                                .update({
                                                    full_name: driverFormData.full_name,
                                                    phone_number: driverFormData.phone_number
                                                })
                                                .eq('id', editingDriver.id)

                                            if (error) throw error
                                            toast.success("Driver updated successfully")
                                        } else {
                                            // Create new
                                            const res = await fetch('/api/admin/create-driver', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(driverFormData)
                                            })

                                            if (!res.ok) {
                                                const err = await res.json()
                                                throw new Error(err.error || "Failed to create driver")
                                            }
                                            toast.success("Driver created successfully")
                                        }
                                        setIsDriverModalOpen(false)
                                        fetchDrivers()
                                    } catch (err: any) {
                                        toast.error(err.message)
                                    } finally {
                                        setDriverLoading(false)
                                    }
                                }}>
                                    {dateRange.start === 'saving' ? <Loader2 className="animate-spin" /> : (editingDriver ? 'Save Changes' : 'Create Account')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Content: Menu Manager Tab */}
            {activeTab === 'menu' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isManagingCategories ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Category Management</h2>
                                <Button variant="outline" onClick={() => setIsManagingCategories(false)}>
                                    <Minus className="mr-2 h-4 w-4" /> Back to Menu
                                </Button>
                            </div>

                            <Card className="p-4">
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="New Category Name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    />
                                    <Button onClick={handleAddCategory}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
                                </div>
                            </Card>

                            <div className="space-y-2">
                                {categories.map((cat, idx) => (
                                    <Card key={cat.id} className="flex flex-col p-4">
                                        <div className="flex items-center justify-between w-full">
                                            {editingCategory?.id === cat.id ? (
                                                <div className="flex gap-2 flex-1 mr-4">
                                                    <Input
                                                        value={editingCategory?.name || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            setEditingCategory(p => p ? { ...p, name: val } : null)
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                                                    />
                                                    <Button size="sm" variant="ghost" className="text-green-600" onClick={handleUpdateCategory}><Save size={16} /></Button>
                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setEditingCategory(null)}><X size={16} /></Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4 flex-1">
                                                    <span className="font-medium text-lg">{cat.name}</span>
                                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                        {menuItems.filter(i => Number(i.category_id) === cat.id).length} items
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => {
                                                    setExpandedCategories(prev =>
                                                        prev.includes(cat.id)
                                                            ? prev.filter(id => id !== cat.id)
                                                            : [...prev, cat.id]
                                                    )
                                                }}>
                                                    {expandedCategories.includes(cat.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </Button>
                                                <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => moveCategory(cat.id, 'up')}><ArrowUp className="h-4 w-4 text-muted-foreground" /></Button>
                                                <Button size="icon" variant="ghost" disabled={idx === categories.length - 1} onClick={() => moveCategory(cat.id, 'down')}><ArrowDown className="h-4 w-4 text-muted-foreground" /></Button>
                                                {!editingCategory && (
                                                    <Button size="icon" variant="ghost" onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}><Edit className="h-4 w-4 text-blue-500" /></Button>
                                                )}
                                                <Button size="icon" variant="ghost" className="hover:bg-red-50" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </div>
                                        </div>

                                        {expandedCategories.includes(cat.id) && (
                                            <div className="mt-4 pl-4 border-l-2 border-muted space-y-2 animate-in slide-in-from-top-2 duration-200">
                                                {menuItems.filter(i => Number(i.category_id) === cat.id).length === 0 ? (
                                                    <p className="text-sm text-muted-foreground italic">No items in this category.</p>
                                                ) : (
                                                    menuItems.filter(i => Number(i.category_id) === cat.id)
                                                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                                        .map(item => (
                                                            <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="relative h-8 w-8 rounded overflow-hidden bg-muted">
                                                                        {item.image_url ? (
                                                                            <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Img</div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-medium">{item.name}</span>
                                                                    {!item.is_available && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Out of Stock</span>}
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                                                </Button>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Menu Items</h2>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsManagingCategories(true)}>
                                        Manage Categories
                                    </Button>
                                    <Button onClick={() => setIsAddingItem(!isAddingItem)}>
                                        {isAddingItem ? <Minus className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                        {isAddingItem ? "Cancel" : "Add New Item"}
                                    </Button>
                                </div>
                            </div>

                            {/* Add Item Form */}
                            {isAddingItem && (
                                <Card className="p-4 border-2 border-primary/20">
                                    <h3 className="font-bold mb-4">Add New Item</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium">Name</label>
                                            <input className="w-full p-2 border rounded" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Price (₹)</label>
                                            <input type="number" className="w-full p-2 border rounded" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Category</label>
                                            <select className="w-full p-2 border rounded" value={newItem.category_id} onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}>
                                                <option value="">Select Category</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Image URL</label>
                                            <div className="flex gap-2">
                                                <input className="w-full p-2 border rounded" value={newItem.image_url} readOnly placeholder="Upload image..." />
                                                <label className="cursor-pointer bg-secondary px-3 py-2 rounded flex items-center">
                                                    <ImageIcon size={16} />
                                                    <input type="file" className="hidden" onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            const url = await uploadImage(file, 'menu')
                                                            if (url) setNewItem({ ...newItem, image_url: url })
                                                        }
                                                    }} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <Button variant="ghost" onClick={() => setIsAddingItem(false)}>Cancel</Button>
                                        <Button onClick={handleAddItem}>Save Item</Button>
                                    </div>
                                </Card>
                            )}

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {menuItems.map(item => (
                                    <Card key={item.id} className="relative overflow-hidden group">
                                        <div className="absolute top-2 right-2 z-20 flex gap-2">
                                            <button
                                                onClick={() => toggleAvailability(item.id, item.is_available)}
                                                className={`px-2 py-1 rounded text-xs font-semibold shadow-sm transition-all ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {item.is_available ? 'In Stock' : 'Sold Out'}
                                            </button>
                                        </div>
                                        <div className="aspect-video w-full overflow-hidden bg-muted relative">
                                            {!item.is_available && (
                                                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                                    <span className="text-white font-bold text-xl uppercase tracking-widest border-2 border-white px-4 py-2 rounded transform -rotate-12">Out of Stock</span>
                                                </div>
                                            )}
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${!item.is_available ? 'grayscale' : ''}`} />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-muted-foreground"><ImageIcon size={24} /></div>
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold">{item.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}</p>
                                                </div>
                                                <div className="font-bold text-primary">₹{item.price}</div>
                                            </div>
                                            <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => moveMenuItem(item.id, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                                                    <Button size="sm" variant="ghost" onClick={() => moveMenuItem(item.id, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                                                </div>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content: Gallery Tab */}
            {activeTab === 'gallery' && (
                <GalleryManager />
            )}

            {/* Content: Banner Manager Tab */}
            {activeTab === 'banners' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Homepage Banners</h2>
                        <Button variant="outline" size="sm" onClick={() => fetchBanners()} disabled={bannerLoading}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${bannerLoading ? 'animate-spin' : ''}`} /> Refresh
                        </Button>
                    </div>

                    {/* Add New Banner */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Add New Banner</h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full relative">
                                <label className="text-xs font-medium mb-1 block">Banner Image</label>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="flex-1 border rounded p-2 text-sm max-w-sm file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const url = await uploadImage(file, 'banners')
                                                if (url) setNewBanner(prev => ({ ...prev, image_url: url }))
                                            }
                                        }}
                                    />
                                    {newBanner.image_url && (
                                        <div className="h-10 w-10 relative rounded overflow-hidden border">
                                            <Image src={newBanner.image_url} alt="Preview" fill className="object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs font-medium mb-1 block">Link (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. /menu or https://google.com"
                                    className="w-full border rounded p-2 text-sm h-[42px]"
                                    value={newBanner.link}
                                    onChange={(e) => setNewBanner(prev => ({ ...prev, link: e.target.value }))}
                                />
                            </div>
                            <Button onClick={handleAddBanner} disabled={!newBanner.image_url} className="h-[42px]">
                                <Plus className="mr-2 h-4 w-4" /> Add Banner
                            </Button>
                        </div>
                    </Card>

                    {/* Banner List */}
                    <div className="space-y-4">
                        {banners.length === 0 && <p className="text-muted-foreground italic">No banners active.</p>}
                        {banners.map((banner) => (
                            <div key={banner.id} className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                                <div className="h-24 w-40 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                                    <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <a href={banner.image_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium truncate block">
                                        {banner.image_url}
                                    </a>
                                    {banner.link && (
                                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                                            <ExternalLink className="h-3 w-3 mr-1" /> Links to: {banner.link}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost" size="icon" className="h-6 w-6"
                                            disabled={banners.findIndex(b => b.id === banner.id) === 0}
                                            onClick={() => moveBanner(banner.id, 'up')}
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon" className="h-6 w-6"
                                            disabled={banners.findIndex(b => b.id === banner.id) === banners.length - 1}
                                            onClick={() => moveBanner(banner.id, 'down')}
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={banner.is_active}
                                            onChange={() => toggleBannerStatus(banner.id, banner.is_active)}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteBanner(banner.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content: Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-bold">Admin Settings</h2>
                    <MfaSettings />
                    <WhatsAppSettings />
                </div>
            )}
        </div>
    )
}

function GalleryManager() {
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
    const [uploading, setUploading] = useState(false)

    const fetchGallery = async () => {
        const { data, error } = await supabase
            .from('gallery_images')
            .select('*')
            .order('sort_order', { ascending: true })
        if (data) setGalleryImages(data)
        if (error) console.error("Error fetching gallery:", error)
    }

    useEffect(() => {
        fetchGallery()
    }, [])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        let successCount = 0

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const url = await uploadImage(file, 'gallery')
            if (url) {
                const { error } = await supabase.from('gallery_images').insert([{
                    image_url: url,
                    is_active: true,
                    // Use length + i + 1 to keep order for batch
                    sort_order: galleryImages.length + i + 1
                }])
                if (!error) successCount++
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} image(s) added`)
            fetchGallery()
        } else {
            toast.error("Failed to upload images")
        }
        setUploading(false)
        // Reset input
        e.target.value = ''
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this image?")) return
        const { error } = await supabase.from('gallery_images').delete().eq('id', id)
        if (error) toast.error("Failed to delete")
        else {
            toast.success("Image deleted")
            fetchGallery()
        }
    }

    const handleMove = async (id: string, direction: 'up' | 'down') => {
        const index = galleryImages.findIndex(img => img.id === id)
        if (index === -1) return
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === galleryImages.length - 1) return

        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const currentImg = galleryImages[index]
        const targetImg = galleryImages[targetIndex]

        // Swap sort_order
        const currentOrder = currentImg.sort_order
        const targetOrder = targetImg.sort_order

        // Optimistic
        const newImages = [...galleryImages]
        newImages[index] = { ...currentImg, sort_order: targetOrder }
        newImages[targetIndex] = { ...targetImg, sort_order: currentOrder }
        newImages.sort((a, b) => a.sort_order - b.sort_order)
        setGalleryImages(newImages)

        // DB Updates
        await supabase.from('gallery_images').update({ sort_order: targetOrder }).eq('id', currentImg.id)
        await supabase.from('gallery_images').update({ sort_order: currentOrder }).eq('id', targetImg.id)
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Restaurant Gallery</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        {galleryImages.length} images
                    </span>
                    <label className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${uploading ? 'opacity-50' : ''}`}>
                        {uploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {uploading ? 'Uploading...' : 'Add Images'}
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryImages.map((img, index) => (
                    <Card key={img.id} className="relative group overflow-hidden aspect-square">
                        <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" disabled={index === 0} onClick={() => handleMove(img.id, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" disabled={index === galleryImages.length - 1} onClick={() => handleMove(img.id, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                            </div>
                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(img.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </Card>
                ))}
                {galleryImages.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/50">
                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                        <p className="mt-2 text-muted-foreground">No images in gallery yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
