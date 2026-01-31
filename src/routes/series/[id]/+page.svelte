<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { BOOK_TYPES, AGE_RANGES, BOOK_STATUS } from '$lib/types';
  import {
    getSeries, updateSeries, deleteSeries, getBooks, getCharacters,
    updateBook, updateCharacter
  } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';

  const seriesId = $page.params.id;

  let series: any = null;
  let loading = true;
  let activeTab: 'overview' | 'books' | 'characters' = 'overview';

  // Edit state
  let editingName = false;
  let editedName = '';
  let editingDescription = false;
  let editedDescription = '';

  // Modal state
  let showDeleteModal = false;
  let showAddBookModal = false;
  let showAddCharacterModal = false;
  let availableBooks: any[] = [];
  let availableCharacters: any[] = [];

  const illustrationStyles = [
    { id: 'watercolor', name: 'Watercolor' },
    { id: 'digital', name: 'Digital Art' },
    { id: 'cartoon', name: 'Cartoon' },
    { id: 'realistic', name: 'Realistic' },
    { id: 'minimalist', name: 'Minimalist' },
    { id: 'retro', name: 'Retro' },
    { id: 'collage', name: 'Collage' },
    { id: 'pencil', name: 'Pencil Sketch' },
    { id: 'flat', name: 'Flat Design' }
  ];

  onMount(async () => {
    await loadSeries();
  });

  async function loadSeries() {
    try {
      loading = true;
      series = await getSeries(seriesId);
      editedName = series.name;
      editedDescription = series.description || '';
    } catch (err) {
      console.error('Failed to load series:', err);
      showError('Failed to load series');
      goto('/series');
    } finally {
      loading = false;
    }
  }

  async function handleUpdateName() {
    if (!editedName.trim()) {
      showError('Name cannot be empty');
      return;
    }

    try {
      await updateSeries(seriesId, { name: editedName.trim() });
      series.name = editedName.trim();
      editingName = false;
      showSuccess('Name updated!');
    } catch (err) {
      showError('Failed to update name');
    }
  }

  async function handleUpdateDescription() {
    try {
      await updateSeries(seriesId, { description: editedDescription.trim() || null });
      series.description = editedDescription.trim() || null;
      editingDescription = false;
      showSuccess('Description updated!');
    } catch (err) {
      showError('Failed to update description');
    }
  }

  async function handleUpdateStyle(newStyle: string) {
    try {
      await updateSeries(seriesId, { illustrationStyle: newStyle });
      series.illustrationStyle = newStyle;
      showSuccess('Illustration style updated!');
    } catch (err) {
      showError('Failed to update style');
    }
  }

  async function handleDelete() {
    try {
      await deleteSeries(seriesId);
      showSuccess('Series deleted');
      goto('/series');
    } catch (err) {
      showError('Failed to delete series');
    }
  }

  async function openAddBookModal() {
    try {
      // Get all books not in any series
      const allBooks = await getBooks();
      availableBooks = allBooks.filter(b => !b.seriesId);
      showAddBookModal = true;
    } catch (err) {
      showError('Failed to load books');
    }
  }

  async function openAddCharacterModal() {
    try {
      // Get all characters not in any series
      const allCharacters = await getCharacters();
      availableCharacters = allCharacters.filter(c => !c.seriesId);
      showAddCharacterModal = true;
    } catch (err) {
      showError('Failed to load characters');
    }
  }

  async function handleAddBook(bookId: string) {
    try {
      await updateBook(bookId, { seriesId });
      showAddBookModal = false;
      showSuccess('Book added to series!');
      await loadSeries();
    } catch (err) {
      showError('Failed to add book');
    }
  }

  async function handleRemoveBook(bookId: string) {
    if (!confirm('Remove this book from the series?')) return;

    try {
      await updateBook(bookId, { seriesId: null });
      showSuccess('Book removed from series');
      await loadSeries();
    } catch (err) {
      showError('Failed to remove book');
    }
  }

  async function handleAddCharacter(characterId: string) {
    try {
      await updateCharacter(characterId, { seriesId });
      showAddCharacterModal = false;
      showSuccess('Character added to series!');
      await loadSeries();
    } catch (err) {
      showError('Failed to add character');
    }
  }

  async function handleRemoveCharacter(characterId: string) {
    if (!confirm('Remove this character from the series?')) return;

    try {
      await updateCharacter(characterId, { seriesId: null });
      showSuccess('Character removed from series');
      await loadSeries();
    } catch (err) {
      showError('Failed to remove character');
    }
  }

  $: styleName = series?.illustrationStyle
    ? illustrationStyles.find(s => s.id === series.illustrationStyle)?.name || series.illustrationStyle
    : 'Not set';
</script>

<svelte:head>
  <title>{series?.name || 'Loading...'} | StorySpark</title>
</svelte:head>

{#if loading}
  <div class="p-8 max-w-6xl mx-auto">
    <div class="animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-4 bg-gray-100 rounded w-1/2 mb-8"></div>
      <div class="card h-64"></div>
    </div>
  </div>
{:else if series}
  <div class="p-8 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <a href="/series" class="text-spark-600 hover:text-spark-700 text-sm mb-2 inline-block">← Back to Series</a>

      <div class="flex items-start justify-between">
        <div class="flex-1">
          {#if editingName}
            <div class="flex items-center gap-2">
              <input
                type="text"
                bind:value={editedName}
                class="text-3xl font-bold text-gray-900 border-b-2 border-spark-500 bg-transparent focus:outline-none"
                onkeydown={(e) => e.key === 'Enter' && handleUpdateName()}
              />
              <button onclick={handleUpdateName} class="text-green-600 hover:text-green-700">✓</button>
              <button onclick={() => { editingName = false; editedName = series.name; }} class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          {:else}
            <h1 class="text-3xl font-bold text-gray-900 cursor-pointer hover:text-spark-700" onclick={() => editingName = true}>
              {series.name}
              <span class="text-sm font-normal text-gray-400 ml-2">✏️</span>
            </h1>
          {/if}

          <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>📚 {series.books?.length || 0} books</span>
            <span>👤 {series.characters?.length || 0} characters</span>
            <span>🎨 {styleName}</span>
          </div>
        </div>

        <button onclick={() => showDeleteModal = true} class="btn btn-secondary text-red-600 hover:bg-red-50">
          🗑️ Delete Series
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-6">
        {#each ['overview', 'books', 'characters'] as tab}
          <button
            onclick={() => activeTab = tab as typeof activeTab}
            class="py-3 text-sm font-medium border-b-2 transition-colors
              {activeTab === tab
                ? 'border-spark-500 text-spark-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}"
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {#if tab === 'books'}
              <span class="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{series.books?.length || 0}</span>
            {:else if tab === 'characters'}
              <span class="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{series.characters?.length || 0}</span>
            {/if}
          </button>
        {/each}
      </nav>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'overview'}
      <div class="grid grid-cols-3 gap-6">
        <!-- Description -->
        <div class="col-span-2 card">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">Description</h2>
            {#if !editingDescription}
              <button onclick={() => editingDescription = true} class="text-sm text-spark-600 hover:text-spark-700">
                ✏️ Edit
              </button>
            {/if}
          </div>

          {#if editingDescription}
            <div>
              <textarea
                bind:value={editedDescription}
                rows="4"
                class="input resize-none w-full"
                placeholder="Describe your series..."
              ></textarea>
              <div class="flex gap-2 mt-2">
                <button onclick={handleUpdateDescription} class="btn btn-primary text-sm">Save</button>
                <button onclick={() => { editingDescription = false; editedDescription = series.description || ''; }} class="btn btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          {:else if series.description}
            <p class="text-gray-600 whitespace-pre-wrap">{series.description}</p>
          {:else}
            <p class="text-gray-400 italic">No description yet. Click Edit to add one.</p>
          {/if}
        </div>

        <!-- Settings -->
        <div class="space-y-4">
          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Illustration Style</h3>
            <select
              value={series.illustrationStyle || ''}
              onchange={(e) => handleUpdateStyle(e.currentTarget.value)}
              class="input"
            >
              <option value="">Select a style</option>
              {#each illustrationStyles as style}
                <option value={style.id}>{style.name}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-2">All books in this series will use this style</p>
          </div>

          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Books</span>
                <span class="font-medium">{series.books?.length || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Characters</span>
                <span class="font-medium">{series.characters?.length || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Created</span>
                <span class="font-medium">{new Date(series.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div class="card bg-spark-50 border-spark-200">
            <h3 class="text-sm font-medium text-spark-800 mb-2">💡 Series Tips</h3>
            <ul class="text-xs text-spark-700 space-y-1">
              <li>• Use consistent characters across books</li>
              <li>• Keep the same illustration style</li>
              <li>• Build on previous storylines</li>
              <li>• Create a recognizable brand</li>
            </ul>
          </div>
        </div>
      </div>

    {:else if activeTab === 'books'}
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Books in Series</h2>
          <button onclick={openAddBookModal} class="btn btn-primary text-sm">
            + Add Book
          </button>
        </div>

        {#if !series.books || series.books.length === 0}
          <div class="text-center py-12">
            <div class="text-4xl mb-3">📚</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
            <p class="text-gray-500 mb-4">Add existing books or create new ones for this series</p>
            <div class="flex gap-3 justify-center">
              <button onclick={openAddBookModal} class="btn btn-primary">Add Existing Book</button>
              <a href="/books/new" class="btn btn-secondary">Create New Book</a>
            </div>
          </div>
        {:else}
          <div class="space-y-3">
            {#each series.books as book (book.id)}
              {@const bookType = BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]}
              {@const status = BOOK_STATUS[book.status as keyof typeof BOOK_STATUS]}
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <a href="/books/{book.id}" class="flex items-center gap-4 flex-1">
                  <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm">
                    {bookType?.icon || '📖'}
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900 hover:text-spark-600">{book.title}</h3>
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                      <span>{bookType?.name || book.bookType}</span>
                      <span>•</span>
                      <span class="{status?.color}">{status?.label || book.status}</span>
                    </div>
                  </div>
                </a>

                <button
                  onclick={() => handleRemoveBook(book.id)}
                  class="text-gray-400 hover:text-red-500 p-2"
                  title="Remove from series"
                >
                  ✕
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'characters'}
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Characters in Series</h2>
          <button onclick={openAddCharacterModal} class="btn btn-primary text-sm">
            + Add Character
          </button>
        </div>

        {#if !series.characters || series.characters.length === 0}
          <div class="text-center py-12">
            <div class="text-4xl mb-3">👤</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No characters yet</h3>
            <p class="text-gray-500 mb-4">Add characters that appear across books in this series</p>
            <div class="flex gap-3 justify-center">
              <button onclick={openAddCharacterModal} class="btn btn-primary">Add Existing Character</button>
              <a href="/characters" class="btn btn-secondary">Create New Character</a>
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-4 gap-4">
            {#each series.characters as character (character.id)}
              <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors group relative">
                <button
                  onclick={() => handleRemoveCharacter(character.id)}
                  class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from series"
                >
                  ✕
                </button>

                <div class="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {#if character.referenceImagePath}
                    <img src={character.referenceImagePath} alt={character.name} class="w-full h-full object-cover" />
                  {:else}
                    <span class="text-4xl">👤</span>
                  {/if}
                </div>

                <h3 class="font-medium text-gray-900 text-center">{character.name}</h3>
                {#if character.role}
                  <p class="text-xs text-gray-500 text-center">{character.role}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Series?</h3>
        <p class="text-gray-600 mb-4">
          Are you sure you want to delete "{series.name}"? Books will be kept but removed from the series. Characters may be deleted.
        </p>
        <div class="flex gap-3">
          <button onclick={() => showDeleteModal = false} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <button onclick={handleDelete} class="btn bg-red-600 text-white hover:bg-red-700 flex-1">
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Add Book Modal -->
  {#if showAddBookModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add Book to Series</h3>
          <button onclick={() => showAddBookModal = false} class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {#if availableBooks.length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500 mb-4">All your books are already in a series.</p>
            <a href="/books/new" class="btn btn-primary">Create New Book</a>
          </div>
        {:else}
          <div class="space-y-2">
            {#each availableBooks as book}
              {@const bookType = BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]}
              <button
                onclick={() => handleAddBook(book.id)}
                class="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-spark-50 hover:border-spark-300 border border-transparent transition-all text-left"
              >
                <div class="text-2xl">{bookType?.icon || '📖'}</div>
                <div>
                  <div class="font-medium text-gray-900">{book.title}</div>
                  <div class="text-xs text-gray-500">{bookType?.name || book.bookType}</div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Add Character Modal -->
  {#if showAddCharacterModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add Character to Series</h3>
          <button onclick={() => showAddCharacterModal = false} class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {#if availableCharacters.length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500 mb-4">All your characters are already in a series.</p>
            <a href="/characters" class="btn btn-primary">Create New Character</a>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-3">
            {#each availableCharacters as character}
              <button
                onclick={() => handleAddCharacter(character.id)}
                class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-spark-50 hover:border-spark-300 border border-transparent transition-all"
              >
                <div class="w-16 h-16 bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {#if character.referenceImagePath}
                    <img src={character.referenceImagePath} alt={character.name} class="w-full h-full object-cover" />
                  {:else}
                    <span class="text-2xl">👤</span>
                  {/if}
                </div>
                <div class="font-medium text-gray-900 text-sm">{character.name}</div>
                {#if character.role}
                  <div class="text-xs text-gray-500">{character.role}</div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
