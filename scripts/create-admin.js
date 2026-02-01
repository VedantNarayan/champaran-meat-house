const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to parse .env files manually to avoid 'dotenv' dependency
function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key] = value;
        }
    });
    return env;
}

// Load env vars
const envLocal = loadEnv(path.join(__dirname, '../.env.local'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    console.error('Ensure .env.local exists and contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createOrPromoteAdmin() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('\nUsage: node scripts/create-admin.js <email> <password> [full_name]');
        process.exit(1);
    }

    const [email, password, fullName = 'Admin User'] = args;

    console.log(`\nChecking for existing user: ${email}...`);

    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        process.exit(1);
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log(`User found (ID: ${existingUser.id}). Promoting to Admin...`);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', existingUser.id);

        if (updateError) {
            console.error("Failed to update profile:", updateError.message);
        } else {
            console.log("✅ Success! User promoted to Admin.");
        }
    } else {
        console.log("User not found. Creating new Admin account...");

        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'admin'
            }
        });

        if (createError) {
            console.error("Failed to create user:", createError.message);
            process.exit(1);
        }

        if (user.user) {
            // Force update profile just in case trigger didn't catch metadata
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ role: 'admin', full_name: fullName })
                .eq('id', user.user.id);

            if (profileError) {
                console.error("User created but profile update failed:", profileError.message);
            } else {
                console.log("✅ Success! New Admin account created.");
            }
        }
    }
}

createOrPromoteAdmin();
