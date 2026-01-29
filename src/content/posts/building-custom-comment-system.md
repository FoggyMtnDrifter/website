---
title: "Building a Custom Comment System with GitHub Discussions"
published: 2026-01-29
draft: false
description: "How I replaced Giscus with a custom comment system powered by GitHub Discussions, complete with guest comments, OAuth, and spam protection."
tags: ['Astro', 'Svelte', 'GitHub API', 'Web Development']
---

I recently decided to replace Giscus on my blog with a custom-built comment system. While Giscus is fantastic, I wanted more control over the user experience and the ability to support guest comments without requiring GitHub authentication. Here's how I built it.

## The Goal

I wanted a comment system that:
- Uses GitHub Discussions as the backend (free, reliable, and I already use GitHub)
- Supports both authenticated GitHub users and anonymous guests
- Has a clean UI that matches my site's aesthetic
- Includes basic spam protection (honeypot + CAPTCHA)
- Sorts comments newest-first

## The Architecture

The system has three main components:

1. **Backend API routes** (Astro SSR endpoints)
2. **Frontend component** (Svelte for reactivity)
3. **OAuth flow** (GitHub authentication)

### Backend: API Routes

I created several API routes in `src/pages/api/`:

#### `/api/comments/[slug].ts`

This is the workhorse. It handles both fetching and posting comments.

**GET**: Fetches all comments for a post by searching GitHub Discussions for a discussion matching the post's pathname.

```typescript
const searchQuery = `repo:${siteConfig.comments.repo} in:title ${term}`
const result = await octokit.graphql(query, { term: searchQuery })
```

The key insight here: GitHub's search API is powerful. By searching for discussions with the post's pathname in the title, I can reliably find the right discussion.

**POST**: Creates a new comment. This is where it gets interesting:

- If the user is authenticated (has a GitHub token cookie), post as them
- If not, post as a bot account and append `_(Posted by DisplayName)_` to the comment body
- The GET endpoint strips this attribution and uses it to display the guest's name

#### OAuth Routes

Three simple routes handle GitHub authentication:

- `/api/auth/signin` - Redirects to GitHub OAuth
- `/api/auth/callback` - Exchanges code for token, stores in HTTP-only cookie
- `/api/auth/signout` - Clears the token cookie

### Frontend: Svelte Component

I chose Svelte for the comment UI because it's lightweight and has excellent reactivity. The component handles:

- Displaying comments with proper nesting (replies)
- A collapsible comment form
- Switching between "Post as Guest" and "Sign in with GitHub" modes
- Client-side CAPTCHA validation for guests

```svelte
{#if authMode === 'guest' && !user}
  <div>
    <label for="captcha">Human Check: What is {num1} + {num2}?</label>
    <input id="captcha" type="number" bind:value={captchaAnswer} required />
  </div>
{/if}
```

## Guest Comments: The Attribution Trick

The clever part about guest comments is how they're stored. Since GitHub Discussions doesn't natively support "guest" authors, I:

1. Post the comment using a bot account
2. Append the guest's display name in a specific format: `_(Posted by Jane Doe)_`
3. On fetch, parse this attribution and transform the comment object
4. Strip the attribution from the HTML before displaying

This means the comment lives in GitHub Discussions, but appears to be from the guest user in my UI.

## Spam Protection

I implemented two layers of protection:

### Honeypot

A hidden field that bots might fill but humans won't:

```svelte
<input type="text" name="website_honey" class="hidden" bind:value={honeyPot} />
```

If this field has a value, the submission is rejected.

### Math CAPTCHA

For guest comments only, a simple math question:

```typescript
if (!userToken) {
  if (parseInt(num1) + parseInt(num2) !== parseInt(answer)) {
    return new Response('Incorrect math answer', { status: 400 })
  }
}
```

It's basic, but effective against simple bots without annoying users with complex CAPTCHAs.

## UI Polish

I spent time making the UI feel native to my site:

- Generic avatars for guests (using DiceBear's initials API)
- Changed "OWNER" badge to "ADMIN"
- Newest-first sorting (reversed the GitHub API response)
- Collapsible form (using native `<details>` element)
- Matched the styling to my "Buy me a coffee" modal

## Configuration

The system is configured in `site.config.ts`:

```typescript
comments: {
  repo: 'FoggyMtnDrifter/website',
  repoId: 'R_kgDORBPuRw',
  category: 'General',
  categoryId: 'DIC_kwDORBPuR84C1bYd',
}
```

You'll also need environment variables:

```bash
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_secret
GITHUB_PERSONAL_ACCESS_TOKEN=your_bot_token
```

## Lessons Learned

1. **GitHub's GraphQL API is powerful** - The search query approach works better than trying to filter discussions directly
2. **HTTP-only cookies are your friend** - Storing OAuth tokens securely is critical
3. **Simple spam protection works** - You don't need reCAPTCHA for a personal blog
4. **Native HTML is underrated** - Using `<details>` for the collapsible form meant zero JavaScript for that feature

## The Result

I now have a comment system that:
- Costs nothing (uses GitHub's free tier)
- Supports both authenticated and guest users
- Matches my site's aesthetic perfectly
- Has basic spam protection
- Gives me full control over the UX

The best part? All comments are stored in GitHub Discussions, so they're backed up, searchable, and I can manage them using GitHub's excellent moderation tools.

If you're building an Astro site and want more control than Giscus provides, this approach is definitely worth considering. The code is all on my [GitHub repo](https://github.com/FoggyMtnDrifter/website) if you want to dig deeper.
