
import type { APIRoute } from 'astro'
export const prerender = false
import Stripe from 'stripe'

// Use a dummy key if env var is missing to allow build to pass (e.g. during static generation or if user hasn't set it yet)
const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
if (STRIPE_SECRET_KEY === 'sk_test_dummy') {
    console.warn('Using dummy Stripe key. Checkout will fail.')
}
const stripe = new Stripe(STRIPE_SECRET_KEY)

export const POST: APIRoute = async ({ request, redirect }) => {
    let amount: number
    let isCustom: boolean

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
        const json = await request.json()
        amount = parseFloat(json.amount || '0')
        isCustom = json.isCustom === true
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        const data = await request.formData()
        amount = parseFloat(data.get('amount')?.toString() || '0')
        isCustom = data.get('isCustom') === 'true'
    } else {
        console.error('Unexpected Content-Type:', contentType)
        return new Response(JSON.stringify({ error: 'Invalid Content-Type' }), { status: 400 })
    }

    if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400 })
    }

    // Ensure minimum amount for Stripe (usually $0.50 USD)
    if (amount < 0.5) {
        return new Response(JSON.stringify({ error: 'Amount must be at least $0.50' }), { status: 400 })
    }

    try {
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Buy me a coffee',
                            description: isCustom ? 'Custom donation' : `Support for FoggyMtnDrifter`,
                        },
                        unit_amount: Math.round(amount * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${request.headers.get('origin')}/?success=true`,
            cancel_url: `${request.headers.get('origin')}/?canceled=true`,
        })

        if (session.url) {
            return new Response(JSON.stringify({ url: session.url }), { status: 200 })
        }

        return new Response(JSON.stringify({ error: 'Failed to create session' }), { status: 500 })

    } catch (err) {
        console.error('Stripe error:', err)
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
    }
}
