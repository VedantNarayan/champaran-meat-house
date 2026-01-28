
import { createClient } from '@supabase/supabase-js'

// Hardcoded for testing script only
const supabaseUrl = 'https://swpjgeymolfdfvmchstr.supabase.co'
const supabaseAnonKey = 'sb_publishable_QcmJXSH1LJpoyvoBvqTbBA_EFedvQHr'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createBrowserTestUser() {
    const email = 'e2e_browser_user@example.com'
    const password = 'password123'
    const phone = '9988776655'
    const fullName = 'E2E Browser User'

    console.log(`Creating/Signing up ${email}...`)

    // Attempt signup
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone: phone
            }
        }
    })

    // If user already exists, we might need to sign in? 
    // signUp returns user even if existing (check documentation: actually it returns error if email taken? or just returns user?)
    // Supabase default: if confirm on, it sends email. If confirm off, it returns user. 
    // If user exists, it might just return success but not log them in?
    // Let's assume clean slate or unique email. 
    // Actually, let's use a random email to be safe.

    if (error) {
        console.log('Signup error (user might exist):', error.message)
    } else {
        console.log('User Created/Found:', data.user?.id)
    }
}

createBrowserTestUser()
