import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

// POST /api/send-order-notification
export async function POST(req: NextRequest) {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const supabase = await createClient()

        // 1. Fetch Order Details
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    quantity,
                    price_at_order,
                    menu_items (name),
                    customizations
                )
            `)
            .eq('id', orderId)
            .single();

        if (error || !order) {
            console.error("Error fetching order for notification:", error);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Format Message
        const itemsList = order.order_items.map((item: any) =>
            `- ${item.quantity}x ${item.menu_items?.name}`
        ).join('\n');

        const address = order.delivery_address;
        const addressStr = typeof address === 'string'
            ? address
            : `${address.fullName}, ${address.phone}\n${address.street}, ${address.city}`;

        const message = `
🍽️ *New Order Received!* 🍽️
Order ID: #${order.id.slice(0, 8)}
Amount: ₹${order.total_amount}

*Items:*
${itemsList}

*Customer Details:*
${addressStr}

Time: ${new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        `.trim();

        // 3. Send Notification (MOCK MODE)
        console.log("------------------------------------------------");
        console.log("📲 [MOCK WHATSAPP NOTIFICATION] TO CHEF:");
        console.log(message);
        console.log("------------------------------------------------");

        // TODO: Integrate real WhatsApp Business API here when keys are provided
        // const whatsappRes = await fetch(process.env.WHATSAPP_API_URL, ...);

        return NextResponse.json({ success: true, message: 'Notification queued (Mock)' });

    } catch (error: any) {
        console.error("Notification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
