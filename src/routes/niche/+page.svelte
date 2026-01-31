<script lang="ts">
  let niches: any[] = [];
  let isResearching = false;
</script>

<svelte:head>
  <title>Niche Research | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Niche Research</h1>
      <p class="text-gray-600">Discover profitable niches and book ideas</p>
    </div>
    <button class="btn btn-primary">
      <span>🔍</span> Research New Niche
    </button>
  </div>

  <!-- Research Tools -->
  <div class="grid grid-cols-3 gap-6 mb-8">
    <div class="card">
      <div class="text-3xl mb-3">📊</div>
      <h3 class="font-semibold text-gray-900 mb-1">Trend Analysis</h3>
      <p class="text-sm text-gray-500 mb-4">AI-powered analysis of current KDP trends</p>
      <button class="btn btn-secondary text-sm w-full">Analyze Trends</button>
    </div>
    <div class="card">
      <div class="text-3xl mb-3">🎯</div>
      <h3 class="font-semibold text-gray-900 mb-1">Competition Check</h3>
      <p class="text-sm text-gray-500 mb-4">Evaluate competition in a specific niche</p>
      <button class="btn btn-secondary text-sm w-full">Check Competition</button>
    </div>
    <div class="card">
      <div class="text-3xl mb-3">💡</div>
      <h3 class="font-semibold text-gray-900 mb-1">Idea Generator</h3>
      <p class="text-sm text-gray-500 mb-4">AI-generated book ideas based on trends</p>
      <button class="btn btn-secondary text-sm w-full">Generate Ideas</button>
    </div>
  </div>

  <!-- Saved Niches -->
  <div class="card">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Saved Niches</h2>

    {#if niches.length === 0}
      <div class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">🔍</div>
        <p>No niches saved yet. Start researching to find profitable opportunities!</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each niches as niche}
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">{niche.name}</h3>
                <p class="text-sm text-gray-500">{niche.category}</p>
              </div>
              <div class="flex gap-2">
                <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  {niche.demandLevel} demand
                </span>
                <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {niche.competitionLevel} competition
                </span>
              </div>
            </div>
            {#if niche.notes}
              <p class="mt-2 text-sm text-gray-600">{niche.notes}</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
