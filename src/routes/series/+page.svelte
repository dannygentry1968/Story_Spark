<script lang="ts">
  let series: any[] = [];
</script>

<svelte:head>
  <title>Series | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Series</h1>
      <p class="text-gray-600">Group related books for consistent branding and characters</p>
    </div>
    <button class="btn btn-primary">
      <span>+</span> New Series
    </button>
  </div>

  {#if series.length === 0}
    <div class="card text-center py-16">
      <div class="text-6xl mb-4">📖</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No series yet</h2>
      <p class="text-gray-600 mb-6">Create a series to group related books and maintain character consistency</p>
      <button class="btn btn-primary">Create Your First Series</button>
    </div>
  {:else}
    <div class="grid grid-cols-3 gap-6">
      {#each series as s}
        <a href="/series/{s.id}" class="card hover:shadow-md transition-shadow">
          <h3 class="font-semibold text-gray-900 text-lg">{s.name}</h3>
          <p class="text-sm text-gray-500 mt-1">{s.description}</p>
          <div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span>{s.bookCount || 0} books</span>
            <span>{s.characterCount || 0} characters</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
