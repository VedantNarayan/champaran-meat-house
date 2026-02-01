"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Navbar } from "@/components/layout/Navbar"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Loader2, Camera, LogOut, User, Phone, Save, X } from "lucide-react"

interface Profile {
    id: string
    full_name: string
    phone_number: string
    avatar_url: string | null
    role: string
}

export default function DriverProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: ""
    })
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error
            if (data) {
                setProfile(data)
                setFormData({
                    full_name: data.full_name || "",
                    phone_number: data.phone_number || ""
                })
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfile = async () => {
        if (!profile) return
        setUpdating(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone_number: formData.phone_number
                })
                .eq('id', profile.id)

            if (error) throw error

            setProfile({ ...profile, ...formData })
            setIsEditing(false)
        } catch (error) {
            alert('Error updating profile')
            console.error(error)
        } finally {
            setUpdating(false)
        }
    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!event.target.files || event.target.files.length === 0) {
                return
            }
            if (!profile) return

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${profile.id}/avatar.${fileExt}`

            // Upload image
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id)

            if (updateError) throw updateError

            setProfile({ ...profile, avatar_url: publicUrl })
        } catch (error) {
            alert('Error uploading avatar')
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/40">
                <Navbar />
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <AuthGuard allowedRoles={['driver']}>
            <div className="min-h-screen bg-muted/40">
                <Navbar />
                <main className="container max-w-lg py-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Driver Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt="Profile"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-12 w-12 text-muted-foreground" />
                                        )}
                                    </div>
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors"
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Camera className="h-4 w-4" />
                                        )}
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-lg capitalize">{profile?.full_name || 'Driver'}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
                                </div>
                            </div>

                            {/* Details Section */}
                            <div className="space-y-4">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                value={formData.phone_number}
                                                maxLength={10}
                                                minLength={10}
                                                type="tel"
                                                pattern="\d{10}"
                                                title="Phone number must be exactly 10 digits"
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length <= 10) setFormData({ ...formData, phone_number: val });
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1"
                                                onClick={handleUpdateProfile}
                                                disabled={updating}
                                            >
                                                {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                                Save
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditing(false)}
                                                disabled={updating}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                                <User className="h-5 w-5 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">Full Name</p>
                                                    <p className="text-sm text-muted-foreground">{profile?.full_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                                <Phone className="h-5 w-5 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">Phone Number</p>
                                                    <p className="text-sm text-muted-foreground">{profile?.phone_number}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Edit Details
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </CardFooter>
                    </Card>
                </main>
            </div>
        </AuthGuard>
    )
}
