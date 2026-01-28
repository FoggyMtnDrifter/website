
import type { APIRoute } from 'astro'
export const prerender = false
import Stripe from 'stripe'

// Use a dummy key if env var is missing to allow build to pass
const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
const stripe = new Stripe(STRIPE_SECRET_KEY)

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json()
        const amount = parseFloat(body.amount)
        const isCustom = body.isCustom === true

        if (!amount || amount <= 0) {
            return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400 })
        }

        // Ensure minimum amount for Stripe (custom requirement: $5 USD)
        if (amount < 5) {
            return new Response(JSON.stringify({ error: 'Amount must be at least $5.00' }), { status: 400 })
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            description: isCustom ? 'Custom donation' : 'Support for FoggyMtnDrifter',
        })

        return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), { status: 200 })

    } catch (err) {
        console.error('Stripe error:', err)
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
    }
}
