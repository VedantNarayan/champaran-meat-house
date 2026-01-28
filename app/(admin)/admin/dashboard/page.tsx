"use client"

import { useSearchParams } from "next/navigation"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCcw, LayoutDashboard, UtensilsCrossed, Calendar as CalendarIcon, Image as ImageIcon, Trash2, ExternalLink, Plus, Minus, ArrowUp, ArrowDown } from "lucide-react"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts"
import { startOfDay, endOfDay, subDays, subMonths, subYears, isWithinInterval, parseISO, format } from "date-fns"
import Image from "next/image"
import { uploadImage } from "@/lib/storage"

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
}

interface Banner {
    id: string
    image_url: string
    link?: string
    is_active: boolean
    sort_order: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get('tab') as 'overview' | 'menu' | 'banners' | null
    const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'banners'>(initialTab || 'overview')

    // --- Data State ---
    const [orders, setOrders] = useState<Order[]>([])
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [banners, setBanners] = useState<Banner[]>([])
    const [categories, setCategories] = useState<any[]>([]) // Should ideally type this
    const [loading, setLoading] = useState(true)
    const [menuLoading, setMenuLoading] = useState(false)
    const [bannerLoading, setBannerLoading] = useState(false)

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

    // --- Filter State ---
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    })
    const [filterLabel, setFilterLabel] = useState("Last 30 Days")

    // --- Fetchers ---
    const fetchOrders = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('orders')
            .select(`*, order_items (quantity, price_at_order, menu_items (name))`)
            .order('created_at', { ascending: false })

        if (data) setOrders(data as any)
        setLoading(false)
    }

    const fetchMenu = async () => {
        setMenuLoading(true)
        const { data } = await supabase
            .from('menu_items')
            .select('*')
            .order('name')

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
        const { data } = await supabase.from('categories').select('*').eq('is_active', true)
        if (data) setCategories(data)
    }

    useEffect(() => {
        fetchOrders()
        fetchMenu() // Fetch menu initially too
        fetchBanners()
        fetchCategories()

        // Realtime Subscriptions
        const orderSub = supabase.channel('admin-dashboard-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
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
            variants: variantsFormatted.length > 0 ? variantsFormatted : null
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

            {/* Content: Menu Manager Tab */}
            {activeTab === 'menu' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Menu Management</h2>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsAddingItem(!isAddingItem)}>
                                {isAddingItem ? <><Minus className="mr-2 h-4 w-4" /> Cancel</> : <><Plus className="mr-2 h-4 w-4" /> Add Item</>}
                            </Button>
                            <Button variant="outline" size="sm" onClick={fetchMenu} disabled={menuLoading}>
                                <RefreshCcw className={`mr-2 h-4 w-4 ${menuLoading ? 'animate-spin' : ''}`} /> Refresh
                            </Button>
                        </div>
                    </div>

                    {isAddingItem && (
                        <Card className="p-6 border-primary/20 bg-primary/5 animate-in slide-in-from-top-2">
                            <h3 className="font-semibold mb-4">Create New Menu Item</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input placeholder="Item Name" className="border p-2 rounded" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                <select className="border p-2 rounded bg-background" value={newItem.category_id} onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input type="number" placeholder="Base Price (₹)" className="border p-2 rounded" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                                <div className="flex items-center gap-4 border p-2 rounded bg-background">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={newItem.is_veg} onChange={e => setNewItem({ ...newItem, is_veg: e.target.checked })} />
                                        <span>Vegetarian?</span>
                                    </label>
                                </div>
                            </div>

                            <textarea placeholder="Description" className="w-full border p-2 rounded mb-4 text-sm" rows={2} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                            <input placeholder="Tags (comma separated, e.g. Spicy, Popular)" className="w-full border p-2 rounded mb-4" value={newItem.tags} onChange={e => setNewItem({ ...newItem, tags: e.target.value })} />

                            {/* Image Upload */}
                            <div className="mb-4">
                                <label className="text-xs font-medium mb-1 block">Item Image</label>
                                <div className="flex gap-2 items-center">
                                    <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            const url = await uploadImage(file, 'menu')
                                            if (url) setNewItem({ ...newItem, image_url: url })
                                        }
                                    }} />
                                    {newItem.image_url && <img src={newItem.image_url} className="h-10 w-10 object-cover rounded border" />}
                                </div>
                            </div>

                            {/* Variants */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium">Variants (Optional)</label>
                                    <Button size="sm" variant="ghost" onClick={() => setNewItem(prev => ({ ...prev, variants: [...prev.variants, { size: '', price: '' }] }))}>+ Add Variant</Button>
                                </div>
                                {newItem.variants.map((v, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input placeholder="Size (e.g. Half, Full)" className="flex-1 border p-1 rounded text-sm" value={v.size} onChange={e => {
                                            const newV = [...newItem.variants]; newV[idx].size = e.target.value; setNewItem({ ...newItem, variants: newV })
                                        }} />
                                        <input type="number" placeholder="Price" className="w-24 border p-1 rounded text-sm" value={v.price} onChange={e => {
                                            const newV = [...newItem.variants]; newV[idx].price = e.target.value; setNewItem({ ...newItem, variants: newV })
                                        }} />
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => {
                                            setNewItem(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }))
                                        }}><Trash2 size={14} /></Button>
                                    </div>
                                ))}
                            </div>

                            <Button onClick={handleAddItem} className="w-full">Create Item</Button>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {menuItems.map((item) => (
                            <Card key={item.id} className={`overflow-hidden transition-all ${!item.is_available ? 'opacity-60 grayscale bg-muted' : 'hover:shadow-lg'}`}>
                                <div className="aspect-video relative w-full">
                                    <Image src={item.image_url || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                                    {!item.is_available && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-lg uppercase tracking-widest">
                                            Out of Stock
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">{item.name}</h3>
                                            <p className="text-muted-foreground">₹{item.price}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <span className={`text-sm font-medium ${item.is_available ? 'text-green-600' : 'text-red-500'}`}>
                                            {item.is_available ? 'Available' : 'Unavailable'}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={item.is_available}
                                                onChange={() => toggleAvailability(item.id, item.is_available)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Content: Banner Manager Tab */}
            {activeTab === 'banners' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Banner Management</h2>
                        <Button variant="outline" size="sm" onClick={fetchBanners} disabled={bannerLoading}>
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
        </div>
    )
}
