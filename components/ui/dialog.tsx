"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
// import { createPortal } from "react-dom" // Use if we want detailed portal handling, but simple conditional rendering often suffices for simple apps. However, for a proper modal, portal is better.
// Actually, for simplicity and ensuring it works within the React tree without hydration issues immediately, I'll stick to a simple overlay first, but Portal is best practice.
// Given strict TS environments, let's keep it simple with AnimatePresence at the root if possible, or just use a fixed overlay z-50.

// Context to share open state
interface DialogContextType {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined)

export const Dialog = ({
    children,
    open,
    onOpenChange,
}: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}) => {
    const [isOpen, setIsOpen] = React.useState(false) // Internal state if uncontrolled

    // Use controlled state if provided, otherwise internal
    const isControlled = open !== undefined
    const finalOpen = isControlled ? open : isOpen
    const finalOnOpenChange = isControlled && onOpenChange ? onOpenChange : setIsOpen

    return (
        <DialogContext.Provider value={{ open: finalOpen, onOpenChange: finalOnOpenChange }}>
            {children}
        </DialogContext.Provider>
    )
}

export const DialogTrigger = ({ children, asChild, className }: { children: React.ReactNode, asChild?: boolean, className?: string }) => {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("DialogTrigger must be used within a Dialog")

    return (
        <div onClick={() => context.onOpenChange(true)} className={className}>
            {children}
        </div>
    )
}

export const DialogContent = ({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) => {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("DialogContent must be used within a Dialog")

    const { open, onOpenChange } = context

    // Prevent scrolling when open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => { document.body.style.overflow = "unset" }
    }, [open])

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    />
                    {/* Content */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={cn(
                                "pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-xl border bg-background p-6 shadow-lg sm:rounded-2xl",
                                className
                            )}
                        >
                            <button
                                onClick={() => onOpenChange(false)}
                                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </button>
                            {children}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

export const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)

export const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)

export const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export const DialogClose = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const context = React.useContext(DialogContext)

    return (
        <button
            ref={ref}
            type="button"
            className={cn("opacity-70 ring-offset-background transition-opacity hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", className)}
            onClick={(e) => {
                context?.onOpenChange(false)
                props.onClick?.(e)
            }}
            {...props}
        />
    )
})
DialogClose.displayName = "DialogClose"
