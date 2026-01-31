<script lang="ts">
  import { PROFIT_PIPELINE, BOOK_TYPES } from '$lib/types';

  // Placeholder data - will be replaced with real data from DB
  let stats = {
    totalBooks: 0,
    inProgress: 0,
    published: 0,
    thisMonth: 0
  };

  let recentBooks: any[] = [];
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
  <div class="grid grid-cols-4 gap-4 mb-8">
    <div class="card">
      <div class="text-3xl font-bold text-gray-900">{stats.totalBooks}</div>
      <div class="text-sm text-gray-500">Total Books</div>
    </div>
    <div class="card">
      <div class="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
      <div class="text-sm text-gray-500">In Progress</div>
    </div>
    <div class="card">
      <div class="text-3xl font-bold text-green-600">{stats.published}</div>
      <div class="text-sm text-gray-500">Published</div>
    </div>
    <div class="card">
      <div class="text-3xl font-bold text-spark-600">{stats.thisMonth}</div>
      <div class="text-sm text-gray-500">This Month</div>
    </div>
  </div>

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

      {#if recentBooks.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📚</div>
          <p>No books yet. Start your first one!</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each recentBooks as book}
            <a href="/books/{book.id}" class="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div class="font-medium text-gray-900">{book.title}</div>
              <div class="text-sm text-gray-500">{book.status}</div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

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
        <a href="/listing" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span class="text-xl">🏷️</span>
          <div>
            <div class="font-medium text-gray-900">Optimize Listings</div>
            <div class="text-sm text-gray-500">Generate keywords & descriptions</div>
          </div>
        </a>
      </div>
    </div>
  </div>
</div>
