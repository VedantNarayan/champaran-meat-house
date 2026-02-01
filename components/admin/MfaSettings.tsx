"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, CheckCircle, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react"

export function MfaSettings({ className }: { className?: string }) {
    const [factors, setFactors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [enrollmentData, setEnrollmentData] = useState<any>(null)
    const [verifyCode, setVerifyCode] = useState("")
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        fetchFactors()
    }, [])

    const fetchFactors = async () => {
        setLoading(true)
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) {
            console.error("MFA Fetch Error:", error)
            // Silently fail or show generic error if needed. 
            // Often just means no session or similar if handled upstream.
        } else {
            // Sort verified factors first
            setFactors(data?.all?.sort((a, b) => (a.status === 'verified' ? -1 : 1)) || [])
        }
        setLoading(false)
    }

    const handleEnroll = async () => {
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: 'Admin Account'
        })
        if (error) {
            toast.error(error.message)
        } else {
            setEnrollmentData(data)
            setVerifyCode("")
        }
    }

    const handleVerifyCancel = async () => {
        if (enrollmentData?.id) {
            await supabase.auth.mfa.unenroll({ factorId: enrollmentData.id })
        }
        setEnrollmentData(null)
    }

    const handleVerify = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            toast.error("Please enter a 6-digit code")
            return
        }
        setVerifying(true)

        // 1. Create a challenge
        const challenge = await supabase.auth.mfa.challenge({ factorId: enrollmentData.id })
        if (challenge.error) {
            toast.error(challenge.error.message)
            setVerifying(false)
            return
        }

        // 2. Verify the challenge
        const verify = await supabase.auth.mfa.verify({
            factorId: enrollmentData.id,
            challengeId: challenge.data.id,
            code: verifyCode
        })

        if (verify.error) {
            toast.error(verify.error.message)
        } else {
            toast.success("Two-Factor Authentication Enabled!")
            setEnrollmentData(null)
            fetchFactors()
        }
        setVerifying(false)
    }

    const handleUnenroll = async (factorId: string) => {
        if (!confirm("Are you sure you want to disable 2FA? Your account will be less secure.")) return;

        const { error } = await supabase.auth.mfa.unenroll({ factorId })
        if (error) {
            toast.error(error.message)
        } else {
            toast.success("2FA Disabled")
            fetchFactors()
        }
    }

    const verifiedFactor = factors.find(f => f.status === 'verified' && f.factor_type === 'totp')

    if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading security settings...</div>

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                </div>
                <CardDescription>
                    Add an extra layer of security to your admin account using an authenticator app (e.g. Google Authenticator).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* STATUS SECTION */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-1">
                        <div className="font-medium">Status</div>
                        <div className={`text-sm flex items-center gap-2 ${verifiedFactor ? 'text-green-600 font-bold' : 'text-yellow-600'}`}>
                            {verifiedFactor ? (
                                <>
                                    <CheckCircle className="h-4 w-4" /> Enabled
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-4 w-4" /> Not Enabled
                                </>
                            )}
                        </div>
                    </div>
                    <div>
                        {!verifiedFactor && !enrollmentData && (
                            <Button onClick={handleEnroll}>Setup 2FA</Button>
                        )}
                        {verifiedFactor && (
                            <Button variant="destructive" size="sm" onClick={() => handleUnenroll(verifiedFactor.id)}>
                                Turn Off
                            </Button>
                        )}
                    </div>
                </div>

                {/* ENROLLMENT FLOW */}
                {enrollmentData && (
                    <div className="border border-primary/20 rounded-lg p-6 space-y-6 bg-primary/5 animate-in fade-in zoom-in-95">
                        <div className="text-center space-y-2">
                            <h3 className="font-bold text-lg">Scan QR Code</h3>
                            <p className="text-sm text-muted-foreground">Open your authenticator app and scan this code.</p>
                        </div>

                        <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto border shadow-sm">
                            {/* Display SVG QR Code safely */}
                            <img
                                src={enrollmentData.totp.qr_code.startsWith('data:')
                                    ? enrollmentData.totp.qr_code
                                    : `data:image/svg+xml;utf8,${encodeURIComponent(enrollmentData.totp.qr_code)}`}
                                alt="Scan this QR code"
                                className="w-48 h-48"
                            />
                        </div>

                        <div className="text-center space-y-1">
                            <div className="text-xs text-muted-foreground">Unable to scan? Enter this code manually:</div>
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded select-all">
                                {enrollmentData.totp.secret}
                            </code>
                        </div>

                        <div className="space-y-4 max-w-xs mx-auto pt-4 border-t border-border/50">
                            <div className="space-y-2">
                                <Label htmlFor="verify-code">Enter 6-digit code</Label>
                                <Input
                                    id="verify-code"
                                    placeholder="000000"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="text-center text-lg tracking-widest"
                                    maxLength={6}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleVerifyCancel}
                                    disabled={verifying}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleVerify}
                                    disabled={verifying || verifyCode.length !== 6}
                                >
                                    {verifying ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
