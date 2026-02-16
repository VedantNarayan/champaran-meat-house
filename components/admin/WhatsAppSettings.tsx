
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export function WhatsAppSettings() {
    // Ideally fetch webhook URL from environment or construct it
    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp'

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    WhatsApp Integration
                </CardTitle>
                <CardDescription>
                    Configure your WhatsApp Business API to enable order status updates via replies.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-md text-sm">
                    <p className="font-semibold mb-2">Setup Instructions:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                        <li>Go to your Meta Developers Dashboard.</li>
                        <li>Select your App and go to <strong>WhatsApp &gt; Configuration</strong>.</li>
                        <li>Click <strong>Edit</strong> in the Webhook section.</li>
                        <li>Enter the Callback URL: <code className="bg-primary/10 p-1 rounded select-all">{webhookUrl}</code></li>
                        <li>Enter the Verify Token (matches <code>WHATSAPP_VERIFY_TOKEN</code> in your .env).</li>
                        <li>Select <strong>messages</strong> subscription field.</li>
                    </ol>
                </div>

                <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2">How to Update Orders via WhatsApp</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                        Reply to any message with the following commands followed by the Order ID (first 8 characters):
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-sm">
                        <li className="flex items-center gap-2"><code className="bg-green-100 text-green-800 px-2 rounded">confirm [ID]</code> Confirmed</li>
                        <li className="flex items-center gap-2"><code className="bg-blue-100 text-blue-800 px-2 rounded">prepare [ID]</code> Preparing</li>
                        <li className="flex items-center gap-2"><code className="bg-yellow-100 text-yellow-800 px-2 rounded">out [ID]</code> Out for Delivery</li>
                        <li className="flex items-center gap-2"><code className="bg-purple-100 text-purple-800 px-2 rounded">done [ID]</code> Delivered</li>
                        <li className="flex items-center gap-2"><code className="bg-red-100 text-red-800 px-2 rounded">cancel [ID]</code> Cancelled</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}
