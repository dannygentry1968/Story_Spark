<script lang="ts">
  import { onMount } from 'svelte';
  import { PROFIT_PIPELINE, BOOK_TYPES, BOOK_STATUS } from '$lib/types';
  import { getStats, type DashboardStats } from '$lib/api/client';
  import { stats, showError } from '$lib/stores';

  let loading = true;

  onMount(async () => {
    try {
      const data = await getStats();
      stats.set(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      showError('Failed to load dashboard data');
    } finally {
      loading = false;
    }
  });

  $: counts = $stats?.counts ?? {
    totalBooks: 0,
    inProgress: 0,
    published: 0,
    exported: 0,
    thisMonth: 0,
    series: 0,
    characters: 0,
    niches: 0
  };

  $: recentBooks = $stats?.recentBooks ?? [];
</script>

<svelte:head>
  <title>Dashboard | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome to StorySpark</h1>
    <p class="text-gray-600">Your AI-powered children's book creation studio</p>
  </div>

  <!-- Quick Stats -->
  {#if loading}
    <div class="grid grid-cols-4 gap-4 mb-8">
      {#each Array(4) as _}
        <div class="card animate-pulse">
          <div class="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div class="h-4 bg-gray-100 rounded w-24"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="card">
        <div class="text-3xl font-bold text-gray-900">{counts.totalBooks}</div>
        <div class="text-sm text-gray-500">Total Books</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-blue-600">{counts.inProgress}</div>
        <div class="text-sm text-gray-500">In Progress</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-green-600">{counts.published}</div>
        <div class="text-sm text-gray-500">Published</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-spark-600">{counts.thisMonth}</div>
        <div class="text-sm text-gray-500">This Month</div>
      </div>
    </div>
  {/if}

  <!-- Create New Book -->
  <div class="card mb-8">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Start a New Book</h2>
    <div class="grid grid-cols-5 gap-4">
      {#each Object.values(BOOK_TYPES) as bookType}
        <a
          href="/books/new?type={bookType.id}"
          class="p-4 border border-gray-200 rounded-xl hover:border-spark-300 hover:bg-spark-50 transition-all group text-center"
        >
          <div class="text-3xl mb-2">{bookType.icon}</div>
          <div class="font-medium text-gray-900 group-hover:text-spark-700">{bookType.name}</div>
          <div class="text-xs text-gray-500 mt-1">{bookType.pageCount} pages</div>
        </a>
      {/each}
    </div>
  </div>

  <!-- Profit Pipeline -->
  <div class="card mb-8">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">The Profit Pipeline</h2>
    <div class="flex items-center justify-between">
      {#each PROFIT_PIPELINE as step, i}
        <div class="flex items-center">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl mb-2">
              {step.icon}
            </div>
            <div class="text-sm font-medium text-gray-900">{step.name}</div>
            <div class="text-xs text-gray-500 max-w-[100px]">{step.description}</div>
          </div>
          {#if i < PROFIT_PIPELINE.length - 1}
            <div class="w-8 h-0.5 bg-gray-200 mx-2"></div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Two Column Layout -->
  <div class="grid grid-cols-2 gap-6">
    <!-- Recent Books -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Recent Books</h2>
        <a href="/books" class="text-sm text-spark-600 hover:text-spark-700">View all →</a>
      </div>

      {#if loading}
        <div class="space-y-3">
          {#each Array(3) as _}
            <div class="p-3 bg-gray-50 rounded-lg animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          {/each}
        </div>
      {:else if recentBooks.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📚</div>
          <p>No books yet. Start your first one!</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each recentBooks as book}
            <a href="/books/{book.id}" class="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div class="flex items-center justify-between">
                <div class="font-medium text-gray-900">{book.title}</div>
                <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {BOOK_STATUS[book.status as keyof typeof BOOK_STATUS]?.label || book.status}
                </span>
              </div>
              <div class="text-sm text-gray-500 mt-1">
                {BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]?.name || book.bookType}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Quick Actions & Stats -->
    <div class="space-y-6">
      <!-- Quick Actions -->
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div class="space-y-2">
          <a href="/niche" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-xl">🔍</span>
            <div>
              <div class="font-medium text-gray-900">Research a Niche</div>
              <div class="text-sm text-gray-500">Find profitable book ideas</div>
            </div>
          </a>
          <a href="/characters" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-xl">👤</span>
            <div>
              <div class="font-medium text-gray-900">Create a Character</div>
              <div class="text-sm text-gray-500">Build your character bible</div>
            </div>
          </a>
          <a href="/series" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-xl">📖</span>
            <div>
              <div class="font-medium text-gray-900">Start a Series</div>
              <div class="text-sm text-gray-500">Group related books together</div>
            </div>
          </a>
        </div>
      </div>

      <!-- More Stats -->
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Your Library</h2>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">{counts.series}</div>
            <div class="text-sm text-gray-500">Series</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{counts.characters}</div>
            <div class="text-sm text-gray-500">Characters</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{counts.niches}</div>
            <div class="text-sm text-gray-500">Niches</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
