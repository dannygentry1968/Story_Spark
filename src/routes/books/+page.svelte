<script lang="ts">
  import { BOOK_TYPES, BOOK_STATUS } from '$lib/types';

  let books: any[] = [];
  let filter = 'all';
</script>

<svelte:head>
  <title>Books | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Books</h1>
      <p class="text-gray-600">Manage all your book projects</p>
    </div>
    <a href="/books/new" class="btn btn-primary">
      <span>+</span> New Book
    </a>
  </div>

  <!-- Filters -->
  <div class="flex gap-2 mb-6">
    <button
      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
        {filter === 'all' ? 'bg-spark-100 text-spark-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => filter = 'all'}
    >
      All
    </button>
    {#each Object.entries(BOOK_STATUS) as [key, status]}
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
          {filter === key ? 'bg-spark-100 text-spark-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
        onclick={() => filter = key}
      >
        {status.label}
      </button>
    {/each}
  </div>

  <!-- Books Grid -->
  {#if books.length === 0}
    <div class="card text-center py-16">
      <div class="text-6xl mb-4">📚</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No books yet</h2>
      <p class="text-gray-600 mb-6">Start your first book and begin your publishing journey</p>
      <a href="/books/new" class="btn btn-primary">Create Your First Book</a>
    </div>
  {:else}
    <div class="grid grid-cols-3 gap-6">
      {#each books as book}
        <a href="/books/{book.id}" class="card hover:shadow-md transition-shadow">
          <div class="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-4xl">
            {BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]?.icon || '📖'}
          </div>
          <h3 class="font-semibold text-gray-900">{book.title}</h3>
          <p class="text-sm text-gray-500">{BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]?.name}</p>
          <div class="mt-2">
            <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {BOOK_STATUS[book.status as keyof typeof BOOK_STATUS]?.label}
            </span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
