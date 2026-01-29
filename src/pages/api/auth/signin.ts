import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
    const client_id = import.meta.env.GITHUB_CLIENT_ID
    if (!client_id) {
        return new Response('Missing GITHUB_CLIENT_ID', { status: 500 })
    }

    const state = crypto.randomUUID()
    cookies.set('github_oauth_state', state, {
        path: '/',
        secure: import.meta.env.PROD,
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: 'lax',
    })

    const url = new URL(request.url)
    const redirectTo = url.searchParams.get('redirect_to')
    if (redirectTo) {
        cookies.set('github_redirect_to', redirectTo, {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            maxAge: 60 * 10, // 10 minutes
            sameSite: 'lax',
        })
    }

    // Store the return URL if provided
    // We can't easily pass it through state efficiently without encoding, 
    // so let's check headers or a query param if we want to support deep linking back.
    // For now, let's keep it simple. callback will handle redirect.

    const params = new URLSearchParams({
        client_id,
        scope: 'public_repo read:user user:email',
        state,
    })

    return redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
}
