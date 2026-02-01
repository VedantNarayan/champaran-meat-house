import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { email, password, full_name, phone_number } = await req.json()

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 1. Create User
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                phone: phone_number,
                role: 'driver' // Ideally handle_new_user trigger sets this, or we overwrite it
            }
        })

        if (createError) throw createError

        if (user.user) {
            // 2. Force update profile to ensure role is driver (in case trigger defaults to customer)
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ role: 'driver', full_name, phone_number })
                .eq('id', user.user.id)

            if (profileError) {
                console.error("Profile update error:", profileError)
                // Don't fail the whole request if user is created but profile update fails slightly, but ideally we should cleanly handle.
            }
        }

        return NextResponse.json({ message: 'Driver created successfully', user })
    } catch (error: any) {
        console.error('Error creating driver:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
