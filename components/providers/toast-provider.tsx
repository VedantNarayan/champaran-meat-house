"use client"

import { Toaster } from "sonner"

export function ToastProvider() {
    return <Toaster richColors position="bottom-right" closeButton toastOptions={{ style: { zIndex: 99999 } }} />
}
