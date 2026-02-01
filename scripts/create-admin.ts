
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.')
    console.error('Ensure .env.local exists and contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createOrPromoteAdmin() {
    const args = process.argv.slice(2)
    if (args.length < 2) {
        console.log('Usage: npx tsx scripts/create-admin.ts <email> <password> [full_name]')
        process.exit(1)
    }

    const [email, password, fullName = 'Admin User'] = args

    console.log(`Checking for existing user: ${email}...`)

    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
        console.error("Error listing users:", listError)
        process.exit(1)
    }

    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
        console.log(`User found (ID: ${existingUser.id}). Promoting to Admin...`)

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', existingUser.id)

        if (updateError) {
            console.error("Failed to update profile:", updateError)
        } else {
            console.log("Success! User promoted to Admin.")
        }
    } else {
        console.log("User not found. Creating new Admin account...")

        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'admin'
            }
        })

        if (createError) {
            console.error("Failed to create user:", createError)
            process.exit(1)
        }

        if (user.user) {
            // Force update profile just in case trigger didn't catch metadata
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ role: 'admin', full_name: fullName })
                .eq('id', user.user.id)

            if (profileError) {
                console.error("User created but profile update failed:", profileError)
            } else {
                console.log("Success! New Admin account created.")
            }
        }
    }
}

createOrPromoteAdmin()
