<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { loadStripe } from '@stripe/stripe-js'
  import type { Stripe, StripeElements } from '@stripe/stripe-js'

  let dialog: HTMLDialogElement
  let stripe: Stripe | null = null
  let elements: StripeElements | null = null
  let paymentElement: any = null /* Stripe Payment Element */

  let isOpen = false
  let step: 'selection' | 'payment' | 'success' = 'selection'
  let amount = 5
  let customAmount: number | null = null
  let isLoading = false
  let error: string | null = null

  // Helper to check if a number is valid amount
  $: finalAmount = customAmount && customAmount > 0 ? customAmount : amount
  $: isCustom = customAmount && customAmount > 0

  onMount(() => {
    // Listen for triggers
    const handleTrigger = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const trigger = target.closest('.bmc-trigger')
      if (trigger) {
        e.preventDefault()
        openModal()
      }
    }

    document.addEventListener('click', handleTrigger)

    // Check hash immediately
    if (window.location.hash === '#coffee') {
      openModal()
    }

    // Listen for hash changes (e.g. if user clicks a link to #coffee while already on page)
    const handleHashChange = () => {
      if (window.location.hash === '#coffee') {
        openModal()
      }
    }
    window.addEventListener('hashchange', handleHashChange)

    // Async initialization
    ;(async () => {
      stripe = await loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY)
    })()

    // Cleanup
    return () => {
      document.removeEventListener('click', handleTrigger)
      window.removeEventListener('hashchange', handleHashChange)
    }
  })

  function openModal() {
    if (!dialog) return
    isOpen = true
    step = 'selection'
    error = null
    isLoading = false
    dialog.showModal()
  }

  function closeModal() {
    if (!dialog) return
    // Small delay to allow fade out if needed, but for native dialog close() handles it immediately usually.
    // We will perform reset after closing.
    dialog.close()
    isOpen = false
    setTimeout(() => {
      resetState()
    }, 300)
  }

  function resetState() {
    step = 'selection'
    error = null
    isLoading = false
    // destroy stripe elements if they exist
    if (paymentElement) {
      paymentElement.destroy()
      paymentElement = null
      elements = null
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    if (!isInDialog) {
      closeModal()
    }
  }

  async function startPayment() {
    if (finalAmount < 5) {
      alert('Please enter an amount of at least $5.00')
      return
    }

    isLoading = true
    error = null

    try {
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          isCustom: isCustom,
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const clientSecret = data.clientSecret
      if (!stripe) throw new Error('Stripe failed to load')

      const computedStyle = getComputedStyle(document.documentElement)
      const getVar = (name: string) => computedStyle.getPropertyValue(name).trim()

      elements = stripe.elements({
        clientSecret,
        fonts: [
          {
            cssSrc: 'https://fonts.googleapis.com/css2?family=Varela&display=swap',
          },
        ],
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: getVar('--theme-accent'),
            colorBackground: getVar('--theme-background'),
            colorText: getVar('--theme-foreground'),
            colorDanger: getVar('--theme-red'),
            fontFamily: 'Varela, sans-serif',
            borderRadius: '0.75rem',
          },
          rules: {
            '.Input': {
              backgroundColor: 'color-mix(in srgb, var(--colorPrimary) 10%, transparent)',
              borderColor: 'transparent',
              boxShadow: 'none',
            },
            '.Input:focus': {
              borderColor: 'var(--colorPrimary)',
              backgroundColor: 'color-mix(in srgb, var(--colorPrimary) 15%, transparent)',
              boxShadow: 'none',
            },
            '.Tab': {
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'color-mix(in srgb, var(--colorPrimary) 5%, transparent)',
            },
            '.Tab:hover': {
              backgroundColor: 'color-mix(in srgb, var(--colorPrimary) 10%, transparent)',
            },
            '.Tab--selected': {
              borderColor: 'var(--colorPrimary)',
              backgroundColor: 'color-mix(in srgb, var(--colorPrimary) 15%, transparent)',
              boxShadow: 'none',
            },
            '.Block': {
              border: 'none',
              boxShadow: 'none',
            },
            '.Label': {
              fontWeight: '500',
              color: 'var(--colorText)',
              opacity: '0.8',
            },
          },
        },
      })

      paymentElement = elements.create('payment')
      // Mount happens in markup via action or just bind:this, but here we wait for step change
      step = 'payment'

      // Wait for DOM update
      setTimeout(() => {
        const container = document.getElementById('payment-element-container')
        if (container && paymentElement) {
          paymentElement.mount('#payment-element-container')
        }
      }, 0)
    } catch (err) {
      console.error(err)
      error = (err as Error).message
    } finally {
      isLoading = false
    }
  }

  async function confirmPayment() {
    isLoading = true
    error = null

    if (!stripe || !elements) return

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?success=true`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      error = stripeError.message || 'Payment failed'
      isLoading = false
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      step = 'success'
      isLoading = false
    }
  }

  function handleRadioChange(val: number) {
    amount = val
    customAmount = null
  }

  function handleCustomInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    if (val) {
      customAmount = parseFloat(val)
    } else {
      customAmount = null
    }
  }
</script>

<dialog
  bind:this={dialog}
  on:close={closeModal}
  on:click={handleOutsideClick}
  class="backdrop:bg-black/50 bg-background border-2 border-accent/20 rounded-xl p-0 w-[90%] max-w-md shadow-2xl transition-all duration-300 text-foreground m-auto"
>
  <div class="relative overflow-hidden">
    <!-- Header -->
    {#if step === 'selection'}
      <div
        in:fly={{ y: -20, duration: 300 }}
        out:fade={{ duration: 200 }}
        class="bg-accent/10 text-center border-b border-accent/10 p-6"
      >
        <h2
          class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent/70"
        >
          Buy Me a Coffee
        </h2>
        <p class="text-sm text-foreground/70 mt-2">
          Keep the terminal running and the caffeine flowing. Support my projects and
          content.
        </p>
      </div>
    {/if}

    <button
      on:click={closeModal}
      class="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors cursor-pointer z-10 bg-transparent border-0 p-0"
      aria-label="Close modal"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <!-- Body -->
    <div class="p-6">
      {#if step === 'selection'}
        <div
          in:fly={{ x: -20, duration: 300, delay: 150 }}
          out:fly={{ x: -20, duration: 200 }}
          class="w-full"
        >
          <!-- Amount Selector -->
          <div class="grid grid-cols-3 gap-3 mb-6">
            {#each [5, 10, 20] as val}
              <label class="cursor-pointer relative">
                <input
                  type="radio"
                  name="amount"
                  value={val}
                  checked={amount === val && !customAmount}
                  on:change={() => handleRadioChange(val)}
                  class="peer sr-only"
                />
                <div
                  class="h-12 flex items-center justify-center rounded-lg border-2 border-accent/20 peer-checked:border-accent peer-checked:bg-accent/10 hover:border-accent/50 transition-all font-bold"
                >
                  ${val}
                </div>
              </label>
            {/each}
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2 text-foreground/80">
              Custom Amount (USD)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50"
                >$</span
              >
              <input
                type="number"
                step="0.50"
                min="5"
                placeholder="Other amount"
                value={customAmount || ''}
                on:input={handleCustomInput}
                class="w-full bg-background border-2 border-accent/20 rounded-lg py-2 pl-8 pr-4 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </div>

          <button
            on:click={startPayment}
            disabled={isLoading}
            class="w-full bg-accent hover:bg-accent/90 text-background font-bold py-3 px-6 rounded-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {#if isLoading}
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
              Loading...
            {:else}
              Enter Payment Details
            {/if}
          </button>
        </div>
      {:else if step === 'payment'}
        <div
          in:fly={{ x: 20, duration: 300, delay: 150 }}
          out:fly={{ x: 20, duration: 200 }}
          class="w-full"
        >
          <div class="text-center mb-6">
            <p class="text-sm text-foreground/60">Your Contribution:</p>
            <p class="text-3xl font-bold text-accent mt-1">
              ${finalAmount.toFixed(2)}
            </p>
          </div>

          <div id="payment-element-container" class="mb-4 min-h-[100px]"></div>

          {#if error}
            <div class="text-sm text-red-500 text-center mb-4">
              {error}
            </div>
          {/if}

          <button
            on:click={confirmPayment}
            disabled={isLoading}
            class="w-full bg-accent hover:bg-accent/90 text-background font-bold py-3 px-6 rounded-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {#if isLoading}
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
              Processing...
            {:else}
              Submit Donation
            {/if}
          </button>
        </div>
      {:else if step === 'success'}
        <div in:fly={{ y: 20, duration: 300 }} class="w-full text-center py-8">
          <div class="text-6xl mb-4">☕️</div>
          <h3
            class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent/70 mb-2"
          >
            Thank you for your support!
          </h3>
          <p class="text-foreground/80 mb-6 px-4">
            Your contribution helps keep my projects and content alive. I truly appreciate
            it!
          </p>
          <button
            on:click={closeModal}
            class="w-full bg-accent/10 hover:bg-accent/20 text-accent font-bold py-2 px-4 rounded-lg transition-colors border border-accent/20"
          >
            Close
          </button>
        </div>
      {/if}

      <p class="text-xs text-center text-foreground/40 mt-4">
        Payments Secured by Stripe
      </p>
    </div>
  </div>
</dialog>

<style>
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
  }

  dialog[open] {
    animation: zoom-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes zoom-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
