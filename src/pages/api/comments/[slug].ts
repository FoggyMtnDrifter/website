import type { APIRoute } from 'astro'
import { Octokit } from 'octokit'
import siteConfig from '~/site.config'

export const prerender = false

const GITHUB_TOKEN = import.meta.env.GITHUB_PERSONAL_ACCESS_TOKEN
const OWNER = 'FoggyMtnDrifter'
const REPO = 'website'

// Helper to get Octokit instance
const getOctokit = (auth?: string) => new Octokit({ auth: auth || GITHUB_TOKEN })

export const GET: APIRoute = async ({ params, request }) => {
    if (!siteConfig.comments) {
        return new Response(JSON.stringify({ error: 'Comments not configured' }), { status: 500 })
    }

    const { slug } = params
    // Mapping is pathname. With the slug, we construct the pathname.
    // Assuming slugs align with pathnames. E.g. posts/slug -> /posts/slug OR just The Title?
    // "pathname" mapping usually uses the pathname of the page.
    // The user's pages are at /posts/[slug]. So search term is likely `/posts/${slug}` or just `/${slug}`?
    // Let's assume `/posts/${slug}` based on typical structure.
    // Wait, the slug param might capture the whole path if it was [...slug], but it's [slug].
    // Let's verify the logic in `src/pages/posts/[slug].astro`.
    // The comments loader uses `pathname`.

    const term = `/posts/${slug}`

    const query = `
      query($term: String!) {
        search(type: DISCUSSION, query: $term, first: 1) {
          nodes {
            ... on Discussion {
              id
              title
              number
              comments(first: 100) {
                nodes {
                  id
                  body
                  bodyHTML
                  createdAt
                  author {
                    login
                    avatarUrl
                    url
                  }
                  replies(first: 20) {
                    nodes {
                      id
                      body
                      bodyHTML
                      createdAt
                      author {
                        login
                        avatarUrl
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    try {
        const octokit = getOctokit()
        const searchQuery = `repo:${siteConfig.comments.repo} in:title ${term}`

        const result: any = await octokit.graphql(query, {
            term: searchQuery
        })

        const discussion = result.search?.nodes?.[0]

        if (discussion && discussion.comments) {
            const transformComment = (comment: any) => {
                const attributionMatch = comment.body.match(/\n\n_\(Posted by (.*?)\)_$/)
                if (attributionMatch) {
                    const displayName = attributionMatch[1]
                    comment.author.login = displayName
                    comment.author.url = '' // Guest has no profile
                    // Use DiceBear for guest avatar
                    comment.author.avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`
                }

                // The HTML is: <p dir="auto"><em>(Posted by Name)</em></p>
                // parsing HTML with regex is fragile but for this specific pattern it's consistent from GitHub
                // We accept optional whitespace and attributes on the p tag.
                if (comment.bodyHTML) {
                    comment.bodyHTML = comment.bodyHTML.replace(/<p[^>]*>\s*<em>\(Posted by .*?\)<\/em>\s*<\/p>\s*$/, '')
                }

                if (comment.replies && comment.replies.nodes) {
                    comment.replies.nodes.forEach(transformComment)
                    // Sort replies: Newest first
                    comment.replies.nodes.reverse()
                }
            }

            discussion.comments.nodes.forEach(transformComment)
            // Sort comments: Newest first
            discussion.comments.nodes.reverse()
        }

        return new Response(JSON.stringify({ discussion }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('Error fetching comments:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), { status: 500 })
    }
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
    const { slug } = params
    const term = `/posts/${slug}`

    let body
    try {
        body = await request.json()
    } catch (e) {
        return new Response('Invalid JSON', { status: 400 })
    }

    const { content, displayName, discussionId, website_honey, captcha } = body
    const userToken = cookies.get('github_access_token')?.value

    // 1. Honeypot Check
    if (website_honey) {
        // Silently fail or return error. Let's return error to stop processing.
        console.log('Honeypot triggered')
        return new Response('Spam detected', { status: 400 })
    }

    // 2. Basic Math Captcha Check (for guests or everyone? User said safeguards. Let's apply to anonymous mainly, but maybe all for safety? Let's apply to ANONYMOUS only as auth users are trusted)
    if (!userToken) {
        if (!captcha || !captcha.num1 || !captcha.num2 || !captcha.answer) {
            return new Response('Captcha required', { status: 400 })
        }
        const { num1, num2, answer } = captcha
        if (parseInt(num1) + parseInt(num2) !== parseInt(answer)) {
            return new Response('Incorrect math answer', { status: 400 })
        }
    }

    // Decide which token and attribution to use
    let finalContent = content
    let auth = userToken

    if (!auth) {
        // Anonymous mode
        if (!displayName) {
            return new Response('Display name required for anonymous comments', { status: 400 })
        }
        auth = GITHUB_TOKEN // Use bot token
        finalContent = `${content}\n\n_(Posted by ${displayName})_`
    }

    if (!auth) {
        return new Response('Server configuration error: No bot token available', { status: 500 })
    }

    const octokit = getOctokit(auth)

    try {
        let finalDiscussionId = discussionId

        // If no discussion ID provided, we must find or create it.
        // This requires the BOT token usually, as regular users might not have permission to create discussions in the category? 
        // Actually, users usually CAN create discussions if the repo is public.
        // But for consistency, let's look it up first.

        if (!finalDiscussionId) {
            // Logic to find or create discussion...
            // Re-use logic from GET or extracting it to a shared helper would be better.
            // For now, let's just error if not found to keep it simple, or implement create logic.

            // Let's implement Find-Or-Create logic using Bot Token (to ensure it's created correctly).
            const botOctokit = getOctokit(GITHUB_TOKEN)

            // 1. Find
            const searchQuery = `repo:${siteConfig.comments!.repo} in:title ${term}`
            const findQuery = `
            query($term: String!) {
                search(type: DISCUSSION, query: $term, first: 1) {
                    nodes { ... on Discussion { id } }
                }
            }
        `
            const findResult: any = await botOctokit.graphql(findQuery, { term: searchQuery })
            const found = findResult.search.nodes[0]

            if (found) {
                finalDiscussionId = found.id
            } else {
                // 2. Create
                if (!siteConfig.comments?.repoId || !siteConfig.comments?.categoryId) {
                    return new Response('Missing repoId or categoryId configuration', { status: 500 })
                }

                const createQuery = `
                mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
                    createDiscussion(input: {
                        repositoryId: $repositoryId,
                        categoryId: $categoryId,
                        title: $title,
                        body: $body
                    }) {
                        discussion { id }
                    }
                }
            `
                // GitHub Discussions usually creates it with a specific body.
                const createResult: any = await botOctokit.graphql(createQuery, {
                    repositoryId: siteConfig.comments.repoId,
                    categoryId: siteConfig.comments.categoryId,
                    title: term,
                    body: `Comments for ${term}\n\n[View Post](${new URL(term, siteConfig.site)})`
                })

                finalDiscussionId = createResult.createDiscussion.discussion.id
            }
        }

        const createCommentQuery = `
      mutation($discussionId: ID!, $body: String!) {
        addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
          comment {
            id
            body
            bodyHTML
            createdAt
            author {
              login
              avatarUrl
              url
            }
          }
        }
      }
    `

        const response: any = await octokit.graphql(createCommentQuery, {
            discussionId: finalDiscussionId,
            body: finalContent
        })

        const newComment = response.addDiscussionComment.comment

        // If it was an anonymous post, we want to return it with the display name immediately
        // so the UI updates correctly without a refetch.
        if (!userToken && displayName) {
            newComment.author.login = displayName
            newComment.author.url = ''
            newComment.author.avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`
            // Strip the attribution from bodyHTML if present
            if (newComment.bodyHTML) {
                newComment.bodyHTML = newComment.bodyHTML.replace(/<p[^>]*>\s*<em>\(Posted by .*?\)<\/em>\s*<\/p>\s*$/, '')
            }
        }

        return new Response(JSON.stringify(newComment), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error posting comment:', error)
        return new Response(JSON.stringify({ error: 'Failed to post comment', details: error }), { status: 500 })
    }
}
