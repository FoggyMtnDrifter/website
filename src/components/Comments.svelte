<script lang="ts">
  import { onMount } from 'svelte'

  export let slug: string

  let comments: any[] = []
  let user: any = null
  let isLoading = true
  let isSubmitting = false
  let error = ''

  let newComment = ''
  let displayName = ''
  let authMode: 'guest' | 'github' = 'guest'

  // Captcha State
  let num1 = Math.floor(Math.random() * 10) + 1
  let num2 = Math.floor(Math.random() * 10) + 1
  let captchaAnswer = ''
  // Honeypot State
  let honeyPot = ''

  // Fetch User
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/user')
      const data = await res.json()
      user = data.user
      if (user) authMode = 'github'
    } catch (e) {
      console.error(e)
    }
  }

  // Fetch Comments
  async function fetchComments() {
    isLoading = true
    try {
      const res = await fetch(`/api/comments/${slug}`)
      const data = await res.json()
      if (data.discussion) {
        comments = data.discussion.comments.nodes
      }
    } catch (e) {
      error = 'Failed to load comments'
    } finally {
      isLoading = false
    }
  }

  onMount(async () => {
    await Promise.all([checkAuth(), fetchComments()])
  })

  async function handleSubmit() {
    if (!newComment.trim()) return
    if (authMode === 'guest' && !displayName.trim()) {
      alert('Please enter a display name')
      return
    }

    // Basic client-side validation for captcha if guest
    if (!user && authMode === 'guest') {
      if (parseInt(captchaAnswer) !== num1 + num2) {
        alert('Incorrect math answer. Please try again.')
        // Reset
        num1 = Math.floor(Math.random() * 10) + 1
        num2 = Math.floor(Math.random() * 10) + 1
        captchaAnswer = ''
        return
      }
    }

    isSubmitting = true
    try {
      const res = await fetch(`/api/comments/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          displayName: authMode === 'guest' ? displayName : undefined,
          website_honey: honeyPot,
          captcha: !user ? { num1, num2, answer: captchaAnswer } : undefined,
        }),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to post')
      }

      const addedComment = await res.json()
      comments = [addedComment, ...comments] // Prepend new comment
      newComment = ''
      captchaAnswer = ''
      // Reset Captcha
      num1 = Math.floor(Math.random() * 10) + 1
      num2 = Math.floor(Math.random() * 10) + 1
    } catch (e: any) {
      error = e.message
    } finally {
      isSubmitting = false
    }
  }

  function signIn() {
    // Save current path to redirect back
    const redirect = window.location.pathname
    window.location.href = `/api/auth/signin?redirect_to=${encodeURIComponent(redirect)}`
  }
</script>

<div class="comments-section not-prose mt-12">
  <!-- Comment Form (Collapsible) -->
  <details
    class="group mb-12 border border-accent/20 rounded-2xl bg-foreground/3 open:bg-foreground/5 transition-colors"
    open={comments.length === 0}
  >
    <summary
      class="flex items-center justify-between p-4 cursor-pointer list-none font-semibold text-heading1 select-none"
    >
      <span>Leave a comment</span>
      <svg
        class="w-5 h-5 text-accent transition-transform group-open:rotate-180"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </summary>

    <div class="px-6 pb-6 pt-2 border-t border-accent/10">
      {#if !user}
        <div class="flex gap-3 mb-6">
          <button
            type="button"
            class="flex-1 py-3 px-4 rounded-lg border-2 font-bold transition-all text-sm {authMode ===
            'guest'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-accent/20 hover:border-accent/50 text-foreground/70'}"
            on:click={() => (authMode = 'guest')}
          >
            Post as Guest
          </button>
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-bold transition-all text-sm {authMode ===
            'github'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-accent/20 hover:border-accent/50 text-foreground/70'}"
            on:click={() => signIn()}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
              ><path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              /></svg
            >
            Sign in with GitHub
          </button>
        </div>
      {/if}

      {#if user}
        <div
          class="flex items-center gap-3 mb-6 p-4 bg-background border-2 border-accent/20 rounded-lg"
        >
          <img
            src={user.avatar_url}
            alt={user.login}
            class="w-10 h-10 rounded-full ring-2 ring-accent/20"
          />
          <div class="flex-1">
            <div class="text-sm text-foreground/60">Signed in as</div>
            <div class="font-bold text-heading1">{user.login}</div>
          </div>
          <a
            href="/api/auth/signout"
            class="text-xs font-bold px-3 py-1.5 rounded-lg border border-accent/20 text-foreground/60 hover:text-red-400 hover:border-red-400/50 transition-colors"
            >Sign out</a
          >
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-5">
        <!-- Honeypot -->
        <input
          type="text"
          name="website_honey"
          class="hidden"
          bind:value={honeyPot}
          tabindex="-1"
          autocomplete="off"
        />

        {#if authMode === 'guest' && !user}
          <div>
            <label
              for="displayName"
              class="block text-sm font-medium text-foreground/80 mb-2 ml-1"
              >Display Name</label
            >
            <input
              id="displayName"
              type="text"
              bind:value={displayName}
              placeholder="Jane Doe"
              class="w-full bg-background border-2 border-accent/20 rounded-lg py-2 px-4 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all text-foreground placeholder-foreground/30"
              required
            />
          </div>
        {/if}

        <div>
          <label
            for="comment"
            class="block text-sm font-medium text-foreground/80 mb-2 ml-1">Comment</label
          >
          <div class="relative">
            <textarea
              id="comment"
              bind:value={newComment}
              rows="4"
              placeholder={authMode === 'guest'
                ? 'Only simple markdown is supported.'
                : 'Write with full markdown support...'}
              class="w-full bg-background border-2 border-accent/20 rounded-lg py-2 px-4 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all text-foreground placeholder-foreground/30 resize-y min-h-[120px]"
              required
            ></textarea>
            <div class="absolute bottom-3 right-3 flex gap-2">
              <a
                href="https://www.markdownguide.org/cheat-sheet/"
                target="_blank"
                rel="noopener noreferrer"
                class="hidden sm:inline-flex items-center text-[10px] text-foreground/30 hover:text-accent transition-colors"
              >
                <svg
                  class="w-3 h-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  /></svg
                >
                Markdown supported
              </a>
            </div>
          </div>
        </div>

        <!-- Captcha for Guest -->
        {#if authMode === 'guest' && !user}
          <div>
            <label
              for="captcha"
              class="block text-sm font-medium text-foreground/80 mb-2 ml-1"
              >Human Check: What is {num1} + {num2}?</label
            >
            <input
              id="captcha"
              type="number"
              bind:value={captchaAnswer}
              placeholder="?"
              class="w-32 bg-background border-2 border-accent/20 rounded-lg py-2 px-4 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all text-foreground placeholder-foreground/30"
              required
            />
          </div>
        {/if}

        <!-- Global button style applied here by using the 'button' tag without override classes except layout -->
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full bg-accent hover:bg-accent/90 text-background font-bold py-3 px-6 rounded-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {#if isSubmitting}
            <svg
              class="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              ><circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle><path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path></svg
            >
            Posting...
          {:else}
            Post Comment
          {/if}
        </button>
      </form>
    </div>
  </details>

  {#if isLoading}
    <div class="flex items-center justify-center py-8 text-foreground/60">
      <svg
        class="animate-spin -ml-1 mr-3 h-5 w-5 text-accent"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      Loading comments...
    </div>
  {:else if error}
    <p class="text-red-500 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
      {error}
    </p>
  {:else}
    <div class="space-y-8 mb-12">
      {#each comments as comment}
        <div class="comment-thread group">
          <!-- Main Comment -->
          <div class="flex gap-4">
            <img
              src={comment.author.avatarUrl}
              alt={comment.author.login}
              class="w-10 h-10 rounded-full border border-accent/20 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div
                class="bg-foreground/5 px-4 py-3 rounded-2xl border border-foreground/10 hover:border-accent/30 transition-colors"
              >
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center gap-2">
                    <a
                      href={comment.author.url || '#'}
                      target={comment.author.url ? '_blank' : ''}
                      rel="noopener noreferrer"
                      class="font-bold text-heading1 hover:text-accent transition-colors"
                    >
                      {comment.author.login}
                    </a>
                    {#if comment.author.login === 'FoggyMtnDrifter'}
                      <span
                        class="bg-accent/10 text-accent text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-accent/20"
                        >ADMIN</span
                      >
                    {/if}
                  </div>
                  <span class="text-xs text-foreground/50 font-mono">
                    {new Date(comment.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div
                  class="prose prose-invert max-w-none text-sm text-foreground/90 leading-relaxed overflow-hidden break-words"
                >
                  {@html comment.bodyHTML}
                </div>
              </div>
            </div>
          </div>

          <!-- Replies -->
          {#if comment.replies && comment.replies.nodes.length > 0}
            <div
              class="ml-5 sm:ml-14 mt-4 space-y-4 border-l-2 border-accent/10 pl-4 sm:pl-6"
            >
              {#each comment.replies.nodes as reply}
                <div class="flex gap-3">
                  <img
                    src={reply.author.avatarUrl}
                    alt={reply.author.login}
                    class="w-8 h-8 rounded-full border border-accent/20 flex-shrink-0"
                  />
                  <div
                    class="flex-1 min-w-0 bg-foreground/3 px-4 py-3 rounded-xl border border-foreground/5 hover:border-accent/20 transition-colors"
                  >
                    <div class="flex justify-between items-center mb-3">
                      <div class="flex items-center gap-2">
                        <a
                          href={reply.author.url || '#'}
                          target={reply.author.url ? '_blank' : ''}
                          rel="noopener noreferrer"
                          class="font-semibold text-sm text-heading1 hover:text-accent transition-colors"
                        >
                          {reply.author.login}
                        </a>
                        {#if reply.author.login === 'FoggyMtnDrifter'}
                          <span
                            class="bg-accent/10 text-accent text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-accent/20"
                            >ADMIN</span
                          >
                        {/if}
                      </div>
                      <span class="text-[10px] text-foreground/50 font-mono">
                        {new Date(reply.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div
                      class="prose prose-invert max-w-none text-sm text-foreground/90 leading-relaxed break-words"
                    >
                      {@html reply.bodyHTML}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      {#if comments.length === 0}
        <div
          class="text-center py-12 bg-foreground/3 rounded-2xl border border-foreground/5 border-dashed"
        >
          <p class="text-foreground/60">No comments yet.</p>
          <p class="text-sm text-accent mt-1">Be the first to post!</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Add any custom styles here if not using Tailwind for everything */
  /* Target links inside the comments, ignoring global prose settings if needed or enhancing them */
  div.prose :global(a) {
    color: var(--color-accent); /* Use CSS variable for accent color */
    text-decoration: underline;
    font-weight: 500;
    text-underline-offset: 2px;
  }
  div.prose :global(p) {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    margin-left: 0;
    margin-right: 0;
  }
  /* Override global prose margins that might be applied to direct children */
  div.prose > :global(*) {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  div.prose :global(a:hover) {
    text-decoration-thickness: 2px;
  }
  div.prose :global(p:first-child) {
    margin-top: 0;
  }
  div.prose :global(p:last-child) {
    margin-bottom: 0;
  }
</style>
