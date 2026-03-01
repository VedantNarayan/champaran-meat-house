import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export async function uploadImage(file: File, folder: string = 'uploads'): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data, error } = await supabase.storage
            .from('images')
            .upload(fileName, file)

        if (error) {
            console.error("Upload error:", error)
            toast.error(`Image Upload Failed: ${error.message}`)
            throw error
        }

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(fileName)

        return publicUrl
    } catch (error: any) {
        console.error("Failed to upload image:", error)
        toast.error(error?.message || "Failed to upload image")
        return null
    }
}
