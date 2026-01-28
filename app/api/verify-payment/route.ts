
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { orderCreationId, razorpayPaymentId, razorpaySignature } =
            await req.json();

        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret'; // Dummy Secret

        const shasum = crypto.createHmac('sha256', keySecret);
        shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpaySignature) {
            return NextResponse.json({ msg: 'Transaction not legit!' }, { status: 400 });
        }

        return NextResponse.json({
            msg: 'success',
            orderId: razorpayPaymentId,
            paymentId: razorpayPaymentId,
        });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
