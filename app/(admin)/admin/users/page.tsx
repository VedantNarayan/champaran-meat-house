"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

import { AuthGuard } from "@/components/auth/AuthGuard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft, User } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface Profile {
    id: string
    full_name: string | null
    role: string
    created_at?: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setProfiles(data || [])
            } catch (error) {
                console.error("Error fetching profiles:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchProfiles()
    }, [])

    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Registered Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4">Loading users...</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No.</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>ID</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profiles.map((profile, index) => (
                                        <TableRow key={profile.id}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell>{profile.full_name || 'N/A'}</TableCell>
                                            <TableCell className="capitalize">{profile.role}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs font-mono">{profile.id}</TableCell>
                                        </TableRow>
                                    ))}
                                    {profiles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    )
}
