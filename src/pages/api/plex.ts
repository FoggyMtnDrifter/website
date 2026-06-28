import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ request, url }) => {
    const PLEX_URL = import.meta.env.PLEX_SERVER_URL
    const PLEX_TOKEN = import.meta.env.PLEX_AUTH_TOKEN
    const PLEX_USER = import.meta.env.PLEX_USERNAME

    // Mock mode for testing or if no env vars are set
    // const url = new URL(request.url) // REMOVED
    const isMock = url.searchParams.get('mock') === 'true'

    if (isMock || !PLEX_URL || !PLEX_TOKEN) {
        return new Response(
            JSON.stringify({
                playing: true,
                title: 'The Matrix',
                year: '1999',
                summary: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
                thumb: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', // Placeholder
                type: 'movie',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
    }

    try {
        const response = await fetch(`${PLEX_URL}/status/sessions?X-Plex-Token=${PLEX_TOKEN}`, {
            headers: {
                Accept: 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Plex API error: ${response.status}`)
        }

        const data = await response.json()

        // Check if there are any sessions
        if (!data.MediaContainer || !data.MediaContainer.Metadata || data.MediaContainer.Metadata.length === 0) {
            return new Response(
                JSON.stringify({ playing: false }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Filter for the specific user if PLEX_USER is set
        // Otherwise just take the first session (or enhance logic as needed)
        let session = data.MediaContainer.Metadata[0]

        if (PLEX_USER) {
            const userSession = data.MediaContainer.Metadata.find((s: any) => s.User && s.User.title === PLEX_USER)
            if (userSession) {
                session = userSession
            } else {
                // User not watching anything
                return new Response(
                    JSON.stringify({ playing: false }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }
        }

        // Only show if state is 'playing' or 'buffering' (ignore 'paused' if you want strictly "Now Playing")
        // But usually seeing paused content is fine too. Let's stick to active sessions.

        return new Response(
            JSON.stringify({
                playing: true,
                title: session.title,
                year: session.year,
                summary: session.summary,
                thumb: session.thumb ? `${PLEX_URL}${session.thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
                type: session.type, // 'movie' or 'episode'
                grandparentTitle: session.grandparentTitle, // Show title for episodes
                parentTitle: session.parentTitle, // Season title
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
    } catch (error) {
        console.error('Error fetching Plex data:', error)
        return new Response(
            JSON.stringify({ playing: false, error: 'Failed to fetch status' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
    }
}
