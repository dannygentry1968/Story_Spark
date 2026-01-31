<script lang="ts">
  import { onMount } from 'svelte';
  import { BOOK_TYPES, BOOK_STATUS } from '$lib/types';
  import { getBooks, deleteBook } from '$lib/api/client';
  import { books as booksStore, showError, showSuccess } from '$lib/stores';
  import type { Book } from '$lib/db/schema';

  let loading = true;
  let filter = 'all';
  let deleteConfirm: string | null = null;

  onMount(async () => {
    await loadBooks();
  });

  async function loadBooks() {
    try {
      loading = true;
      const data = await getBooks();
      booksStore.set(data);
    } catch (err) {
      console.error('Failed to load books:', err);
      showError('Failed to load books');
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBook(id);
      booksStore.update(books => books.filter(b => b.id !== id));
      showSuccess('Book deleted');
      deleteConfirm = null;
    } catch (err) {
      showError('Failed to delete book');
    }
  }

  $: filteredBooks = filter === 'all'
    ? $booksStore
    : $booksStore.filter(b => b.status === filter);
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
  <div class="flex gap-2 mb-6 flex-wrap">
    <button
      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
        {filter === 'all' ? 'bg-spark-100 text-spark-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => filter = 'all'}
    >
      All ({$booksStore.length})
    </button>
    {#each Object.entries(BOOK_STATUS) as [key, status]}
      {@const count = $booksStore.filter(b => b.status === key).length}
      {#if count > 0}
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
            {filter === key ? 'bg-spark-100 text-spark-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => filter = key}
        >
          {status.label} ({count})
        </button>
      {/if}
    {/each}
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="grid grid-cols-3 gap-6">
      {#each Array(6) as _}
        <div class="card animate-pulse">
          <div class="aspect-[3/4] bg-gray-200 rounded-lg mb-4"></div>
          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-gray-100 rounded w-1/2"></div>
        </div>
      {/each}
    </div>
  {:else if filteredBooks.length === 0}
    <div class="card text-center py-16">
      <div class="text-6xl mb-4">📚</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">
        {filter === 'all' ? 'No books yet' : `No ${BOOK_STATUS[filter as keyof typeof BOOK_STATUS]?.label.toLowerCase()} books`}
      </h2>
      <p class="text-gray-600 mb-6">
        {filter === 'all' ? 'Start your first book and begin your publishing journey' : 'Create a new book or change the filter'}
      </p>
      <a href="/books/new" class="btn btn-primary">Create Your First Book</a>
    </div>
  {:else}
    <div class="grid grid-cols-3 gap-6">
      {#each filteredBooks as book (book.id)}
        <div class="card hover:shadow-md transition-shadow relative group">
          <!-- Delete button -->
          <button
            class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
            onclick={(e) => { e.preventDefault(); deleteConfirm = book.id; }}
          >
            🗑️
          </button>

          <a href="/books/{book.id}" class="block">
            <div class="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg mb-4 flex items-center justify-center text-5xl">
              {BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]?.icon || '📖'}
            </div>
            <h3 class="font-semibold text-gray-900 mb-1">{book.title}</h3>
            {#if book.subtitle}
              <p class="text-sm text-gray-600 mb-1">{book.subtitle}</p>
            {/if}
            <p class="text-sm text-gray-500">{BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]?.name || book.bookType}</p>
            <div class="mt-3 flex items-center justify-between">
              <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {BOOK_STATUS[book.status as keyof typeof BOOK_STATUS]?.label || book.status}
              </span>
              {#if book.pageCount}
                <span class="text-xs text-gray-400">{book.pageCount} pages</span>
              {/if}
            </div>
          </a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
{#if deleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => deleteConfirm = null}>
    <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Book?</h3>
      <p class="text-gray-600 mb-6">This will permanently delete this book and all its pages. This action cannot be undone.</p>
      <div class="flex gap-3">
        <button class="btn btn-secondary flex-1" onclick={() => deleteConfirm = null}>
          Cancel
        </button>
        <button class="btn bg-red-500 text-white hover:bg-red-600 flex-1" onclick={() => handleDelete(deleteConfirm!)}>
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}
