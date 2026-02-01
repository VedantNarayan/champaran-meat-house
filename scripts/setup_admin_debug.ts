
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://swpjgeymolfdfvmchstr.supabase.co'
const supabaseServiceKey = 'sb_secret_MHRnRGzUStgKSdHylOMXeg_8z4hZouD'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ensureAdmin() {
    const email = 'admin@example.com'
    const password = 'password123'

    // 1. Get or Create User
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    let user = users?.find(u => u.email === email)

    if (!user) {
        console.log("Creating admin user...")
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Admin User' }
        })
        if (error) throw error
        user = data.user
    } else {
        console.log("Admin user exists, updating password...")
        const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
        if (error) throw error
    }

    if (!user) throw new Error("Failed to find/create user")

    // 2. Ensure Profile & Role
    console.log("Updating profile role...")
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            role: 'admin',
            full_name: 'Admin User'
        })

    if (profileError) console.error("Profile Error:", profileError)
    else console.log("Success! Login with:", email, password)
}

ensureAdmin().catch(console.error)
