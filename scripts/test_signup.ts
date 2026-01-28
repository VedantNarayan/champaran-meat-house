
import { createClient } from '@supabase/supabase-js'

// Hardcoded for testing script only
const supabaseUrl = 'https://swpjgeymolfdfvmchstr.supabase.co'
const supabaseAnonKey = 'sb_publishable_QcmJXSH1LJpoyvoBvqTbBA_EFedvQHr'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSignupAndProfile() {
    const email = `test_Verify_${Date.now()}@example.com`
    const password = 'password123'
    const phone = '9988776655'
    const fullName = 'Verification User'

    console.log(`1. Signing up ${email}...`)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone: phone
            }
        }
    })

    if (signUpError) {
        console.error('Signup FAILED:', signUpError.message)
        return
    }
    console.log('Signup SUCCESS. User ID:', signUpData.user?.id)

    // 2. Sign In to get session and read profile
    console.log('2. Signing in...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (signInError) {
        console.error('SignIn FAILED:', signInError.message)
        return
    }
    console.log('SignIn SUCCESS.')

    // 3. Read Profile
    console.log('3. Reading Profile...')
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single()

    if (profileError) {
        console.error('Profile Fetch FAILED:', profileError.message)
    } else {
        console.log('Profile Data:', profile)
        if (profile.phone_number === phone) {
            console.log('VERIFICATION PASSED: Phone number matches!')
        } else {
            console.error('VERIFICATION FAILED: Phone number mismatch!', profile.phone_number)
        }
    }
}

testSignupAndProfile()
