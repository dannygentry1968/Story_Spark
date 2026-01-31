<script lang="ts">
  import { toasts, removeToast } from '$lib/stores';

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const colorMap = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
</script>

{#if $toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-50 space-y-2">
    {#each $toasts as toast (toast.id)}
      <div
        class="flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border border-gray-100 min-w-[300px] max-w-[400px] animate-slide-in"
        role="alert"
      >
        <div class="{colorMap[toast.type]} text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
          {iconMap[toast.type]}
        </div>
        <p class="flex-1 text-gray-700 text-sm">{toast.message}</p>
        <button
          onclick={() => removeToast(toast.id)}
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
