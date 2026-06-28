<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade, fly } from 'svelte/transition'

  let playing = false
  let data: any = null
  let isOpen = false
  let interval: any

  async function checkPlexStatus() {
    try {
      // Add ?mock=true to test the UI in development if needed
      // For now, we'll let it try to hit the real endpoint, which defaults to mock if no env vars are present
      const res = await fetch('/api/plex') // ?mock=true for testing
      if (res.ok) {
        const json = await res.json()
        playing = json.playing
        data = json
      }
    } catch (e) {
      console.error('Failed to check Plex status', e)
    }
  }

  onMount(() => {
    checkPlexStatus()
    interval = setInterval(checkPlexStatus, 60000) // Check every minute
  })

  onDestroy(() => {
    if (interval) clearInterval(interval)
  })

  function toggle() {
    isOpen = !isOpen
  }
</script>

{#if playing}
  <!-- The "Easter Egg" Trigger -->
  <!-- Positioned fixed in bottom right, very subtle opacity until hovered -->
  <button
    on:click={toggle}
    class="fixed bottom-4 right-4 z-40 p-2 rounded-full bg-accent/10 hover:bg-accent/80 text-accent hover:text-white transition-all duration-300 opacity-30 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent"
    aria-label="What's playing?"
    title="Now Playing"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-popcorn"
      ><path d="M18 8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v2h12Z" /><path
        d="M4 10a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2Z"
      /><path d="M7 10V5.63a2.6 2.6 0 0 1 1.77-2.63h0A2.6 2.6 0 0 1 11.2 5v5" /><path
        d="M13 10V4.54a2.5 2.5 0 0 1 1.76-2.54h0A2.5 2.5 0 0 1 17.15 4v6"
      /></svg
    >
  </button>

  {#if isOpen && data}
    <!-- Modal Backdrop -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      transition:fade={{ duration: 200 }}
      on:click={toggle}
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Content -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div
        class="bg-background border border-accent/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden cursor-default"
        transition:fly={{ y: 20, duration: 300 }}
        on:click|stopPropagation
        role="document"
      >
        <!-- Close Button -->
        <button
          on:click={toggle}
          class="absolute top-3 right-3 p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="18" x2="6" y1="6" y2="18" /><line
              x1="6"
              x2="18"
              y1="6"
              y2="18"
            /></svg
          >
        </button>

        <div class="flex flex-col gap-4">
          <div class="space-y-1">
            <h3 class="text-xs uppercase tracking-wider font-semibold text-accent">
              Now Watching
            </h3>
            <h2 class="text-xl font-bold text-foreground leading-tight">
              {#if data.grandparentTitle}
                {data.grandparentTitle} - {data.title}
              {:else}
                {data.title}
              {/if}
            </h2>
            <p class="text-sm text-muted-foreground">
              {data.year || ''} • {data.type === 'episode' ? 'TV Episode' : 'Movie'}
            </p>
          </div>

          {#if data.thumb}
            <div
              class="rounded-xl overflow-hidden aspect-video bg-neutral-900 relative shadow-lg"
            >
              <img src={data.thumb} alt={data.title} class="w-full h-full object-cover" />
            </div>
          {/if}

          <p
            class="text-sm text-foreground/80 leading-relaxed max-h-32 overflow-y-auto pr-2 custom-scrollbar"
          >
            {data.summary || 'No summary available.'}
          </p>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Custom Scrollbar for summary text */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.3);
    border-radius: 20px;
  }
</style>
