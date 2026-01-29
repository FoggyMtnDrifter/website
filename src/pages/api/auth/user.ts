import type { APIRoute } from 'astro'
import { Octokit } from 'octokit'

export const prerender = false

export const GET: APIRoute = async ({ cookies }) => {
    const token = cookies.get('github_access_token')?.value

    if (!token) {
        return new Response(JSON.stringify({ user: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    try {
        const octokit = new Octokit({ auth: token })
        const { data: user } = await octokit.rest.users.getAuthenticated()

        return new Response(JSON.stringify({ user }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error fetching user:', error)
        // If token is invalid, clear it?
        // cookies.delete('github_access_token', { path: '/' })
        return new Response(JSON.stringify({ user: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
