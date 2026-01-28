
import { createClient } from '@supabase/supabase-js';

// Credentials from .env.local
const SUPABASE_URL = 'https://swpjgeymolfdfvmchstr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QcmJXSH1LJpoyvoBvqTbBA_EFedvQHr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyOrderInsert() {
    console.log("1. Starting Verification: Attempting to insert a test order...");

    const testOrderId = crypto.randomUUID();
    const testOrder = {
        id: testOrderId,
        total_amount: 100,
        status: 'pending',
        delivery_address: {
            fullName: "Test User",
            phone: "9999999999",
            street: "Test Street",
            city: "Test City"
        },
        user_id: null // Simulating Guest Checkout
    };

    const { data, error } = await supabase
        .from('orders')
        .insert([testOrder])
        .select();

    if (error) {
        console.error("❌ INSERT FAILED:", error.message);
        console.error("   Reason: RLS Policies likely blocking public/guest inserts.");
        console.error("   Solution: Please run the 'enable_order_inserts.sql' script in Supabase SQL Editor.");
        process.exit(1);
    } else {
        console.log("✅ INSERT SUCCESS: Order created successfully.");
        console.log("   Order ID:", testOrderId);

        // Cleanup
        console.log("2. Cleaning up (Deleting test order)...");
        const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', testOrderId);

        if (deleteError) {
            console.warn("⚠️ Cleanup Failed (This is expected if DELETE is restricted to Admins).");
        } else {
            console.log("✅ Cleanup Success.");
        }

        console.log("\nCONCLUSION: The Checkout Process is working correctly regarding Database Persistence.");
    }
}

verifyOrderInsert();
