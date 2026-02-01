
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://swpjgeymolfdfvmchstr.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_QcmJXSH1LJpoyvoBvqTbBA_EFedvQHr'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyLogin() {
    console.log("Attempting login...")
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'password123'
    })

    if (error) {
        console.error("Login Failed:", error.message)
    } else {
        console.log("Login Success!")
        console.log("User ID:", data.user.id)
        console.log("Role (JWT):", data.session?.user?.role) // This is 'authenticated', not the profile role

        // Check profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

        if (profileError) console.error("Profile Fetch Error:", profileError)
        else console.log("Profile Role:", profile.role)
    }
}

verifyLogin()
