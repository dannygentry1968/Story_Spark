<script lang="ts">
  let listings: any[] = [];
</script>

<svelte:head>
  <title>Listings | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">KDP Listings</h1>
      <p class="text-gray-600">Optimize your book listings for maximum discoverability</p>
    </div>
  </div>

  <!-- Listing Generator -->
  <div class="card mb-8">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Listing Generator</h2>
    <p class="text-gray-600 mb-4">Generate optimized titles, descriptions, and keywords for your books</p>

    <div class="grid grid-cols-2 gap-6">
      <div>
        <label class="label">Select a Book</label>
        <select class="input">
          <option value="">Choose a book to optimize</option>
          <!-- Will be populated from DB -->
        </select>
      </div>
      <div class="flex items-end">
        <button class="btn btn-primary">Generate Listing</button>
      </div>
    </div>
  </div>

  <!-- Listings -->
  <div class="card">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Saved Listings</h2>

    {#if listings.length === 0}
      <div class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">🏷️</div>
        <p>No listings generated yet. Select a book above to create an optimized listing.</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each listings as listing}
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">{listing.title}</h3>
                {#if listing.subtitle}
                  <p class="text-sm text-gray-600">{listing.subtitle}</p>
                {/if}
              </div>
              <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {listing.status}
              </span>
            </div>
            <div class="mt-3 flex gap-2">
              {#each (listing.keywords || []).slice(0, 5) as keyword}
                <span class="px-2 py-1 bg-white border border-gray-200 text-gray-600 text-xs rounded">
                  {keyword}
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
