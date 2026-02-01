
const https = require('https');

const SUPABASE_URL = 'https://swpjgeymolfdfvmchstr.supabase.co';
const SERVICE_KEY = 'sb_secret_MHRnRGzUStgKSdHylOMXeg_8z4hZouD';

async function fetchJson(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SUPABASE_URL);
        const reqOptions = {
            method: options.method || 'GET',
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = https.request(url, reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`API Error ${res.statusCode}: ${body}`));
                } else {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function run() {
    const email = 'admin_curl@example.com';
    const password = 'password123';

    console.log(`Setting up ${email}...`);

    // 1. List users to check existence
    // Supabase Admin list users: GET /auth/v1/admin/users
    let userId;
    try {
        const usersPage = await fetchJson('/auth/v1/admin/users');
        const user = usersPage.users.find(u => u.email === email);
        if (user) {
            console.log('User exists, ID:', user.id);
            userId = user.id;

            // Update password
            console.log('Updating password...');
            await fetchJson(`/auth/v1/admin/users/${userId}`, {
                method: 'PUT',
                body: { password: password }
            });
        }
    } catch (e) {
        console.log('Error listing users or user not found:', e.message);
    }

    if (!userId) {
        console.log('Creating user...');
        const newUser = await fetchJson('/auth/v1/admin/users', {
            method: 'POST',
            body: {
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { full_name: 'Admin Curl' }
            }
        });
        userId = newUser.id || newUser.user.id; // shape varies
        console.log('User created:', userId);
    }

    // 2. Update Profile Role
    // Table: profiles. 
    // Need to Upsert. POST to /rest/v1/profiles with Prefer: resolution=merge-duplicates in header?
    // standard upsert via REST: POST /rest/v1/profiles
    // Headers: Prefer: resolution=merge-duplicates

    console.log('Updating profile role...');
    // We need to fetch current profile first to not overwrite other fields? 
    // Or just patch.
    // Try PATCH by ID first.

    try {
        await fetchJson(`/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            body: { role: 'admin' }
        });
        console.log('Profile role updated via PATCH');
    } catch (e) {
        console.log('PATCH failed, trying POST upsert...', e.message);
        await fetchJson('/rest/v1/profiles', {
            method: 'POST',
            headers: {
                'Prefer': 'resolution=merge-duplicates'
            },
            body: {
                id: userId,
                role: 'admin',
                full_name: 'Admin Curl'
            }
        });
        console.log('Profile role updated via UPSERT');
    }

    console.log(`Done! Login with ${email} / ${password}`);
}

run().catch(console.error);
