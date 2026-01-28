import { Navbar } from "@/components/layout/Navbar"
import { AuthGuard } from "@/components/auth/AuthGuard"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className="min-h-screen bg-muted/40">
                <Navbar />
                <main className="container py-6">
                    {children}
                </main>
            </div>
        </AuthGuard>
    )
}
