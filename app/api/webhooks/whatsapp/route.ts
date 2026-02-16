import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from; // Sender's phone number
                const msgBody = message.text ? message.text.body : '';

                // Simple parser: "Confirm 123" -> Update status
                // Status Mapping:
                // confirm -> confirmed
                // prepare -> preparing
                // deliver -> out_for_delivery
                // done -> delivered
                // cancel -> cancelled

                const parts = msgBody.trim().split(' ');
                if (parts.length >= 2) {
                    const command = parts[0].toLowerCase();
                    // Assuming Order ID is the second part, but UUID is long. 
                    // Maybe we use Short ID (first 8 chars) or user replies to a message.
                    // For now, let's assume they copy the FULL UUID or use a logic to find by short ID.
                    // Or, strict format: "Confirm <Full-UUID>"

                    const orderIdLike = parts[1];
                    let status = null;

                    switch (command) {
                        case 'confirm': status = 'confirmed'; break;
                        case 'prepare': status = 'preparing'; break;
                        case 'out': status = 'out_for_delivery'; break; // "Out" for "Out for delivery"
                        case 'done': status = 'delivered'; break;
                        case 'cancel': status = 'cancelled'; break;
                    }

                    if (status) { // Valid command
                        // Search for order by ID (partial match if short)
                        const { data: orders, error } = await supabase
                            .from('orders')
                            .select('id')
                            .ilike('id', `${orderIdLike}%`)
                            .limit(1);

                        if (orders && orders.length > 0) {
                            const orderId = orders[0].id;
                            const { error: updateError } = await supabase
                                .from('orders')
                                .update({ status })
                                .eq('id', orderId);

                            if (!updateError) {
                                console.log(`Order ${orderId} updated to ${status}`);
                                // Optional: Send confirmation back to WhatsApp
                            }
                        }
                    }
                }
            }
            return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }
        return new NextResponse('Not Found', { status: 404 });
    } catch (error) {
        console.error('Error handling webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
