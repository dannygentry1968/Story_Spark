<script lang="ts">
  let characters: any[] = [];
</script>

<svelte:head>
  <title>Characters | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Character Bible</h1>
      <p class="text-gray-600">Create and manage reusable characters for visual consistency</p>
    </div>
    <button class="btn btn-primary">
      <span>+</span> New Character
    </button>
  </div>

  {#if characters.length === 0}
    <div class="card text-center py-16">
      <div class="text-6xl mb-4">👤</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No characters yet</h2>
      <p class="text-gray-600 mb-6">Create characters with reference images for consistent illustrations across your books</p>
      <button class="btn btn-primary">Create Your First Character</button>
    </div>
  {:else}
    <div class="grid grid-cols-4 gap-6">
      {#each characters as character}
        <div class="card hover:shadow-md transition-shadow">
          <div class="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            {#if character.referenceImagePath}
              <img src={character.referenceImagePath} alt={character.name} class="w-full h-full object-cover rounded-lg" />
            {:else}
              <span class="text-4xl">👤</span>
            {/if}
          </div>
          <h3 class="font-semibold text-gray-900">{character.name}</h3>
          <p class="text-sm text-gray-500">{character.role}</p>
          {#if character.seriesName}
            <p class="text-xs text-spark-600 mt-1">{character.seriesName}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
