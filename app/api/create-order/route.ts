
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag', // Dummy Key
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret', // Dummy Secret
});

export async function POST(req: NextRequest) {
    let amount: number | undefined;
    let currency = 'INR';

    try {
        const body = await req.json();
        amount = body.amount;
        if (body.currency) currency = body.currency;

        const options = {
            amount: amount! * 100, // amount in paisa
            currency,
            receipt: 'receipt_' + Math.random().toString(36).substring(7),
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
        });
    } catch (err: any) {
        console.error("Razorpay Order Creation Failed:", err);

        // DEVELOPMENT ONLY: Fallback to mock order if credentials fail
        if (process.env.NODE_ENV === 'development') {
            console.log("Returning MOCK order for testing");
            // Use the amount variable from the outer scope, with a fallback if undefined
            // Note: amount might be undefined if the initial parsing failed, so handle that.
            const mockAmount = typeof amount === 'number' ? amount * 100 : 10000;

            return NextResponse.json({
                id: 'order_mock_' + Math.random().toString(36).substring(7),
                currency: 'INR',
                amount: mockAmount,
            });
        }

        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
