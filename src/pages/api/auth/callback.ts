import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedState = cookies.get('github_oauth_state')?.value

    if (!state || !storedState || state !== storedState) {
        return new Response('Invalid state', { status: 400 })
    }

    cookies.delete('github_oauth_state', { path: '/' })

    const client_id = import.meta.env.GITHUB_CLIENT_ID
    const client_secret = import.meta.env.GITHUB_CLIENT_SECRET

    if (!client_id || !client_secret) {
        return new Response('Missing GitHub credentials', { status: 500 })
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code,
            }),
        })

        const data = await response.json()

        if (data.error) {
            return new Response(data.error_description || 'OAuth Error', { status: 400 })
        }

        const { access_token } = data

        // Securely store the token
        cookies.set('github_access_token', access_token, {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
        })

        const redirectTo = cookies.get('github_redirect_to')?.value
        cookies.delete('github_redirect_to', { path: '/' })

        return redirect(redirectTo || '/')
    } catch (err) {
        console.error(err)
        return new Response('Authentication failed', { status: 500 })
    }
}
