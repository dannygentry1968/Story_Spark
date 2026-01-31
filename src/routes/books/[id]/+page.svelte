<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { BOOK_TYPES, AGE_RANGES, BOOK_STATUS, PROFIT_PIPELINE } from '$lib/types';
  import {
    getBook, getBookPages, updateBook, generateOutline, generatePageText,
    generatePageIllustration, deleteBook, createExport, getBookExports,
    getExportStatus, getExportDownloadUrl, deleteExport, generateListingContent,
    getListings, createListing, updateListing
  } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';
  import { TRIM_SIZES } from '$lib/services/pdf-export';

  const bookId = $page.params.id;

  let book: any = null;
  let pages: any[] = [];
  let exports: any[] = [];
  let listings: any[] = [];
  let loading = true;
  let activeTab: 'overview' | 'pages' | 'illustrations' | 'listing' | 'export' = 'overview';
  let generating = false;
  let generatingPageId: string | null = null;
  let showDeleteModal = false;
  let editingTitle = false;
  let editedTitle = '';

  // Export state
  let exporting = false;
  let exportType: 'interior' | 'cover' = 'interior';
  let exportTrimSize = '8.5x8.5';
  let exportPaperType: 'white' | 'cream' = 'white';
  let exportIncludeBleed = true;
  let currentExportId: string | null = null;
  let exportProgress = 0;

  // Listing state
  let generatingListing = false;
  let currentListing: any = null;
  let editingListing = false;
  let listingForm = {
    title: '',
    subtitle: '',
    description: '',
    keywords: [] as string[],
    categories: [] as string[],
    backCoverText: ''
  };
  let newKeyword = '';

  onMount(async () => {
    await loadBook();
  });

  async function loadBook() {
    try {
      loading = true;
      const [bookData, pagesData, exportsData, listingsData] = await Promise.all([
        getBook(bookId),
        getBookPages(bookId),
        getBookExports(bookId).catch(() => []),
        getListings(bookId).catch(() => [])
      ]);
      book = bookData;
      pages = pagesData;
      exports = exportsData;
      listings = listingsData;
      editedTitle = book.title;
      exportTrimSize = book.trimSize || '8.5x8.5';

      // Load current listing if exists
      if (listings.length > 0) {
        currentListing = listings[0];
        loadListingIntoForm(currentListing);
      }
    } catch (err) {
      console.error('Failed to load book:', err);
      showError('Failed to load book');
      goto('/books');
    } finally {
      loading = false;
    }
  }

  function loadListingIntoForm(listing: any) {
    listingForm = {
      title: listing.title || '',
      subtitle: listing.subtitle || '',
      description: listing.description || '',
      keywords: listing.keywords || [],
      categories: listing.categories || [],
      backCoverText: listing.backCoverText || ''
    };
  }

  async function handleGenerateListing() {
    if (!book.concept && !book.outline) {
      showError('Add a book concept or outline first');
      return;
    }

    try {
      generatingListing = true;
      showInfo('Generating KDP listing content...');

      const result = await generateListingContent({
        title: book.title,
        bookType: book.bookType,
        targetAge: book.targetAge,
        storySummary: book.concept || book.outline || '',
        themes: book.themes || [],
        characters: book.characters?.map((c: any) => c.name) || []
      });

      // Update form with generated content
      listingForm = {
        title: result.title,
        subtitle: result.subtitle,
        description: result.description,
        keywords: result.keywords,
        categories: result.categories,
        backCoverText: result.backCoverText
      };

      showSuccess('Listing content generated!');
    } catch (err) {
      console.error('Failed to generate listing:', err);
      showError('Failed to generate listing');
    } finally {
      generatingListing = false;
    }
  }

  async function handleSaveListing() {
    try {
      const listingData = {
        bookId: book.id,
        ...listingForm,
        status: 'draft'
      };

      if (currentListing) {
        const updated = await updateListing(currentListing.id, listingData);
        currentListing = updated;
        showSuccess('Listing saved!');
      } else {
        const created = await createListing(listingData);
        currentListing = created;
        listings = [created, ...listings];
        showSuccess('Listing created!');
      }
      editingListing = false;
    } catch (err) {
      console.error('Failed to save listing:', err);
      showError('Failed to save listing');
    }
  }

  function addKeyword() {
    if (newKeyword.trim() && listingForm.keywords.length < 7) {
      listingForm.keywords = [...listingForm.keywords, newKeyword.trim()];
      newKeyword = '';
    }
  }

  function removeKeyword(index: number) {
    listingForm.keywords = listingForm.keywords.filter((_, i) => i !== index);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showSuccess(`${label} copied to clipboard!`);
  }

  async function handleExport() {
    try {
      exporting = true;
      exportProgress = 0;
      showInfo(`Creating ${exportType} PDF...`);

      const job = await createExport({
        bookId: book.id,
        type: exportType,
        trimSize: exportTrimSize,
        paperType: exportPaperType,
        includeBleed: exportIncludeBleed,
        colorMode: 'color'
      });

      currentExportId = job.id;
      exports = [job, ...exports];

      // Poll for completion
      await pollExportStatus(job.id);
    } catch (err) {
      console.error('Failed to create export:', err);
      showError('Failed to create export');
    } finally {
      exporting = false;
      currentExportId = null;
    }
  }

  async function pollExportStatus(exportId: string) {
    const maxAttempts = 60;
    const intervalMs = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await getExportStatus(exportId);
        exportProgress = Math.min(90, (i / maxAttempts) * 100);

        // Update exports list
        const idx = exports.findIndex(e => e.id === exportId);
        if (idx !== -1) {
          exports[idx] = status;
          exports = [...exports];
        }

        if (status.status === 'completed') {
          exportProgress = 100;
          showSuccess('Export completed! Click to download.');
          return;
        }

        if (status.status === 'failed') {
          showError('Export failed. Please try again.');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (err) {
        console.error('Failed to check export status:', err);
      }
    }

    showError('Export timed out. Please try again.');
  }

  async function handleDeleteExport(exportId: string) {
    try {
      await deleteExport(exportId);
      exports = exports.filter(e => e.id !== exportId);
      showSuccess('Export deleted');
    } catch (err) {
      showError('Failed to delete export');
    }
  }

  async function handleGenerateOutline() {
    if (!book.concept) {
      showError('Please add a book concept first');
      return;
    }

    try {
      generating = true;
      showInfo('Generating story outline...');

      const result = await generateOutline({
        bookId: book.id,
        bookType: book.bookType,
        targetAge: book.targetAge,
        concept: book.concept,
        pageCount: book.pageCount
      });

      showSuccess('Outline generated!');
      await loadBook(); // Reload to get new pages
    } catch (err) {
      console.error('Failed to generate outline:', err);
      showError('Failed to generate outline');
    } finally {
      generating = false;
    }
  }

  async function handleGeneratePageText(pageId: string, pageNumber: number) {
    try {
      generatingPageId = pageId;
      showInfo(`Generating text for page ${pageNumber}...`);

      const pageData = pages.find(p => p.id === pageId);

      await generatePageText({
        bookId: book.id,
        pageId,
        pageNumber,
        outline: pageData?.outline || '',
        bookType: book.bookType,
        targetAge: book.targetAge
      });

      showSuccess('Page text generated!');
      await loadBook();
    } catch (err) {
      console.error('Failed to generate page text:', err);
      showError('Failed to generate page text');
    } finally {
      generatingPageId = null;
    }
  }

  async function handleGenerateIllustration(pageId: string, pageNumber: number) {
    try {
      generatingPageId = pageId;
      showInfo(`Generating illustration for page ${pageNumber}...`);

      const pageData = pages.find(p => p.id === pageId);

      await generatePageIllustration({
        bookId: book.id,
        pageId,
        pageNumber,
        prompt: pageData?.illustrationPrompt || pageData?.outline || '',
        style: book.illustrationStyle || 'watercolor'
      });

      showSuccess('Illustration generated!');
      await loadBook();
    } catch (err) {
      console.error('Failed to generate illustration:', err);
      showError('Failed to generate illustration');
    } finally {
      generatingPageId = null;
    }
  }

  async function handleUpdateTitle() {
    if (!editedTitle.trim()) {
      showError('Title cannot be empty');
      return;
    }

    try {
      await updateBook(bookId, { title: editedTitle.trim() });
      book.title = editedTitle.trim();
      editingTitle = false;
      showSuccess('Title updated!');
    } catch (err) {
      showError('Failed to update title');
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    try {
      await updateBook(bookId, { status: newStatus });
      book.status = newStatus;
      showSuccess('Status updated!');
    } catch (err) {
      showError('Failed to update status');
    }
  }

  async function handleDelete() {
    try {
      await deleteBook(bookId);
      showSuccess('Book deleted');
      goto('/books');
    } catch (err) {
      showError('Failed to delete book');
    }
  }

  $: bookTypeInfo = book ? BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES] : null;
  $: ageInfo = book ? AGE_RANGES[book.targetAge as keyof typeof AGE_RANGES] : null;
  $: statusInfo = book ? BOOK_STATUS[book.status as keyof typeof BOOK_STATUS] : null;
  $: completedPages = pages.filter(p => p.text && p.illustrationPath).length;
  $: progress = pages.length > 0 ? Math.round((completedPages / pages.length) * 100) : 0;
</script>

<svelte:head>
  <title>{book?.title || 'Loading...'} | StorySpark</title>
</svelte:head>

{#if loading}
  <div class="p-8 max-w-6xl mx-auto">
    <div class="animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-4 bg-gray-100 rounded w-1/4 mb-8"></div>
      <div class="card h-64"></div>
    </div>
  </div>
{:else if book}
  <div class="p-8 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <a href="/books" class="text-spark-600 hover:text-spark-700 text-sm mb-2 inline-block">← Back to Books</a>

      <div class="flex items-start justify-between">
        <div class="flex-1">
          {#if editingTitle}
            <div class="flex items-center gap-2">
              <input
                type="text"
                bind:value={editedTitle}
                class="text-3xl font-bold text-gray-900 border-b-2 border-spark-500 bg-transparent focus:outline-none"
                onkeydown={(e) => e.key === 'Enter' && handleUpdateTitle()}
              />
              <button onclick={handleUpdateTitle} class="text-green-600 hover:text-green-700">✓</button>
              <button onclick={() => { editingTitle = false; editedTitle = book.title; }} class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          {:else}
            <h1 class="text-3xl font-bold text-gray-900 cursor-pointer hover:text-spark-700" onclick={() => editingTitle = true}>
              {book.title}
              <span class="text-sm font-normal text-gray-400 ml-2">✏️</span>
            </h1>
          {/if}

          <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{bookTypeInfo?.icon} {bookTypeInfo?.name}</span>
            <span>Ages {ageInfo?.label}</span>
            <span>{book.pageCount} pages</span>
            <span>{book.trimSize}"</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <select
            value={book.status}
            onchange={(e) => handleUpdateStatus(e.currentTarget.value)}
            class="input py-1 px-3 text-sm"
          >
            {#each Object.entries(BOOK_STATUS) as [key, status]}
              <option value={key}>{status.label}</option>
            {/each}
          </select>

          <button onclick={() => showDeleteModal = true} class="btn btn-secondary text-red-600 hover:bg-red-50">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">Book Progress</span>
        <span class="text-sm text-gray-500">{completedPages}/{pages.length} pages complete</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-spark-500 h-2 rounded-full transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-6">
        {#each ['overview', 'pages', 'illustrations', 'listing', 'export'] as tab}
          <button
            onclick={() => activeTab = tab as typeof activeTab}
            class="py-3 text-sm font-medium border-b-2 transition-colors
              {activeTab === tab
                ? 'border-spark-500 text-spark-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}"
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        {/each}
      </nav>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'overview'}
      <div class="grid grid-cols-3 gap-6">
        <!-- Book Concept -->
        <div class="col-span-2 card">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Book Concept</h2>
          {#if book.concept}
            <p class="text-gray-600 whitespace-pre-wrap">{book.concept}</p>
          {:else}
            <p class="text-gray-400 italic">No concept added yet.</p>
          {/if}

          <div class="mt-4 pt-4 border-t">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Story Outline</h3>
            {#if book.outline}
              <p class="text-gray-600 text-sm whitespace-pre-wrap">{book.outline}</p>
            {:else}
              <div class="text-center py-4">
                <p class="text-gray-500 mb-3">Generate a story outline based on your concept</p>
                <button
                  onclick={handleGenerateOutline}
                  disabled={generating || !book.concept}
                  class="btn btn-primary"
                >
                  {#if generating}
                    <span class="animate-spin">⏳</span> Generating...
                  {:else}
                    ✨ Generate Outline
                  {/if}
                </button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="space-y-4">
          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Status</h3>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full {statusInfo?.color.replace('text-', 'bg-')}"></span>
              <span class="font-medium">{statusInfo?.label}</span>
            </div>
          </div>

          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Pages</h3>
            <div class="text-2xl font-bold text-gray-900">{pages.length}</div>
            <div class="text-sm text-gray-500">{completedPages} completed</div>
          </div>

          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Characters</h3>
            <div class="text-2xl font-bold text-gray-900">{book.characters?.length || 0}</div>
            <a href="/characters" class="text-sm text-spark-600 hover:text-spark-700">Manage →</a>
          </div>

          {#if book.seriesId}
            <div class="card">
              <h3 class="text-sm font-medium text-gray-700 mb-3">Series</h3>
              <a href="/series/{book.seriesId}" class="text-spark-600 hover:text-spark-700">
                View Series →
              </a>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'pages'}
      <div class="space-y-4">
        {#if pages.length === 0}
          <div class="card text-center py-12">
            <div class="text-4xl mb-3">📄</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No pages yet</h3>
            <p class="text-gray-500 mb-4">Generate an outline to create your book's pages</p>
            <button
              onclick={handleGenerateOutline}
              disabled={generating || !book.concept}
              class="btn btn-primary"
            >
              {#if generating}
                <span class="animate-spin">⏳</span> Generating...
              {:else}
                ✨ Generate Outline
              {/if}
            </button>
          </div>
        {:else}
          {#each pages as pg (pg.id)}
            <div class="card">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-spark-100 text-spark-700 flex items-center justify-center font-bold">
                  {pg.pageNumber}
                </div>

                <div class="flex-1">
                  <h3 class="font-medium text-gray-900 mb-1">Page {pg.pageNumber}</h3>

                  {#if pg.outline}
                    <p class="text-sm text-gray-500 mb-2">{pg.outline}</p>
                  {/if}

                  {#if pg.text}
                    <div class="bg-gray-50 rounded-lg p-3 mb-2">
                      <p class="text-sm text-gray-700">{pg.text}</p>
                    </div>
                  {:else}
                    <button
                      onclick={() => handleGeneratePageText(pg.id, pg.pageNumber)}
                      disabled={generatingPageId === pg.id}
                      class="text-sm text-spark-600 hover:text-spark-700"
                    >
                      {#if generatingPageId === pg.id}
                        ⏳ Generating text...
                      {:else}
                        ✨ Generate text
                      {/if}
                    </button>
                  {/if}
                </div>

                <div class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {#if pg.illustrationPath}
                    <img src={pg.illustrationPath} alt="Page {pg.pageNumber}" class="w-full h-full object-cover" />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center text-gray-400">
                      <button
                        onclick={() => handleGenerateIllustration(pg.id, pg.pageNumber)}
                        disabled={generatingPageId === pg.id}
                        class="text-xs text-center"
                      >
                        {#if generatingPageId === pg.id}
                          ⏳
                        {:else}
                          🖼️<br/>Generate
                        {/if}
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

    {:else if activeTab === 'illustrations'}
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Illustrations</h2>

        {#if pages.length === 0}
          <p class="text-gray-500 text-center py-8">Generate pages first to add illustrations</p>
        {:else}
          <div class="grid grid-cols-4 gap-4">
            {#each pages as pg (pg.id)}
              <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                {#if pg.illustrationPath}
                  <img src={pg.illustrationPath} alt="Page {pg.pageNumber}" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onclick={() => handleGenerateIllustration(pg.id, pg.pageNumber)}
                      disabled={generatingPageId === pg.id}
                      class="btn btn-secondary text-sm"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                {:else}
                  <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2">
                    <span class="text-2xl mb-1">🖼️</span>
                    <span class="text-xs text-center">Page {pg.pageNumber}</span>
                    <button
                      onclick={() => handleGenerateIllustration(pg.id, pg.pageNumber)}
                      disabled={generatingPageId === pg.id || !pg.outline}
                      class="mt-2 text-xs text-spark-600 hover:text-spark-700"
                    >
                      {#if generatingPageId === pg.id}
                        ⏳ Generating...
                      {:else}
                        ✨ Generate
                      {/if}
                    </button>
                  </div>
                {/if}
                <div class="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                  {pg.pageNumber}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'listing'}
      <div class="grid grid-cols-3 gap-6">
        <!-- Listing Form -->
        <div class="col-span-2 space-y-4">
          <!-- Generate Button -->
          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">KDP Listing Content</h2>
                <p class="text-sm text-gray-500">AI-generated Amazon listing optimized for discoverability</p>
              </div>
              <button
                onclick={handleGenerateListing}
                disabled={generatingListing}
                class="btn btn-primary"
              >
                {#if generatingListing}
                  <span class="animate-spin">⏳</span> Generating...
                {:else}
                  ✨ Generate Listing
                {/if}
              </button>
            </div>
          </div>

          <!-- Title & Subtitle -->
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">Title & Subtitle</h3>
              {#if listingForm.title}
                <button
                  onclick={() => copyToClipboard(`${listingForm.title}${listingForm.subtitle ? ': ' + listingForm.subtitle : ''}`, 'Title')}
                  class="text-xs text-spark-600 hover:text-spark-700"
                >
                  📋 Copy
                </button>
              {/if}
            </div>
            <div class="space-y-3">
              <div>
                <label for="listingTitle" class="label">Title (max 200 chars)</label>
                <input
                  id="listingTitle"
                  type="text"
                  bind:value={listingForm.title}
                  maxlength="200"
                  class="input"
                  placeholder="Your book title for Amazon"
                />
                <div class="text-xs text-gray-400 mt-1">{listingForm.title.length}/200</div>
              </div>
              <div>
                <label for="listingSubtitle" class="label">Subtitle (optional)</label>
                <input
                  id="listingSubtitle"
                  type="text"
                  bind:value={listingForm.subtitle}
                  class="input"
                  placeholder="A subtitle for your book"
                />
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">Book Description</h3>
              {#if listingForm.description}
                <button
                  onclick={() => copyToClipboard(listingForm.description, 'Description')}
                  class="text-xs text-spark-600 hover:text-spark-700"
                >
                  📋 Copy
                </button>
              {/if}
            </div>
            <textarea
              bind:value={listingForm.description}
              rows="8"
              class="input"
              placeholder="Write a compelling description for your book..."
            ></textarea>
            <div class="text-xs text-gray-400 mt-1">{listingForm.description.length}/4000 characters (Amazon max)</div>
          </div>

          <!-- Keywords -->
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">Keywords ({listingForm.keywords.length}/7)</h3>
              {#if listingForm.keywords.length > 0}
                <button
                  onclick={() => copyToClipboard(listingForm.keywords.join(', '), 'Keywords')}
                  class="text-xs text-spark-600 hover:text-spark-700"
                >
                  📋 Copy All
                </button>
              {/if}
            </div>
            <p class="text-sm text-gray-500 mb-3">Amazon allows up to 7 keywords/phrases to help readers find your book</p>

            <div class="flex gap-2 mb-3">
              <input
                type="text"
                bind:value={newKeyword}
                placeholder="Add a keyword..."
                class="input flex-1"
                onkeydown={(e) => e.key === 'Enter' && addKeyword()}
                disabled={listingForm.keywords.length >= 7}
              />
              <button
                onclick={addKeyword}
                disabled={!newKeyword.trim() || listingForm.keywords.length >= 7}
                class="btn btn-secondary"
              >
                + Add
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              {#each listingForm.keywords as keyword, i}
                <span class="inline-flex items-center gap-1 px-3 py-1 bg-spark-100 text-spark-700 rounded-full text-sm">
                  {keyword}
                  <button
                    onclick={() => removeKeyword(i)}
                    class="text-spark-500 hover:text-spark-700 ml-1"
                  >
                    ×
                  </button>
                </span>
              {/each}
              {#if listingForm.keywords.length === 0}
                <span class="text-sm text-gray-400 italic">No keywords added yet</span>
              {/if}
            </div>
          </div>

          <!-- Back Cover Text -->
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">Back Cover Text</h3>
              {#if listingForm.backCoverText}
                <button
                  onclick={() => copyToClipboard(listingForm.backCoverText, 'Back cover text')}
                  class="text-xs text-spark-600 hover:text-spark-700"
                >
                  📋 Copy
                </button>
              {/if}
            </div>
            <textarea
              bind:value={listingForm.backCoverText}
              rows="4"
              class="input"
              placeholder="Short teaser text for the back cover..."
            ></textarea>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end">
            <button
              onclick={handleSaveListing}
              disabled={!listingForm.title}
              class="btn btn-primary"
            >
              💾 Save Listing
            </button>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-4">
          <!-- Categories -->
          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Suggested Categories</h3>
            {#if listingForm.categories.length > 0}
              <ul class="space-y-2 text-sm">
                {#each listingForm.categories as category}
                  <li class="flex items-start gap-2">
                    <span class="text-spark-500">📂</span>
                    <span class="text-gray-600">{category}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-sm text-gray-400 italic">Generate a listing to see suggested categories</p>
            {/if}
          </div>

          <!-- Tips -->
          <div class="card bg-amber-50 border-amber-200">
            <h3 class="text-sm font-medium text-amber-800 mb-2">💡 KDP Listing Tips</h3>
            <ul class="text-xs text-amber-700 space-y-1">
              <li>• Use all 7 keyword slots for best discoverability</li>
              <li>• Front-load important words in your title</li>
              <li>• Description should hook readers in first 200 chars</li>
              <li>• Include age range in keywords (e.g., "ages 3-5")</li>
              <li>• Research competitor keywords before finalizing</li>
            </ul>
          </div>

          <!-- Listing Status -->
          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Listing Status</h3>
            {#if currentListing}
              <div class="flex items-center gap-2 text-sm">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                <span class="text-gray-600">Saved</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                Last updated: {new Date(currentListing.updatedAt || currentListing.createdAt).toLocaleDateString()}
              </div>
            {:else}
              <div class="flex items-center gap-2 text-sm">
                <span class="w-2 h-2 rounded-full bg-gray-300"></span>
                <span class="text-gray-500">Not created</span>
              </div>
            {/if}
          </div>

          <!-- Quick Copy All -->
          {#if listingForm.title && listingForm.description}
            <div class="card bg-spark-50 border-spark-200">
              <h3 class="text-sm font-medium text-spark-800 mb-2">Quick Export</h3>
              <button
                onclick={() => copyToClipboard(
                  `TITLE: ${listingForm.title}\n\nSUBTITLE: ${listingForm.subtitle || 'N/A'}\n\nDESCRIPTION:\n${listingForm.description}\n\nKEYWORDS: ${listingForm.keywords.join(', ')}\n\nBACK COVER:\n${listingForm.backCoverText}`,
                  'All listing content'
                )}
                class="btn btn-secondary w-full text-sm"
              >
                📋 Copy All Content
              </button>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'export'}
      <div class="grid grid-cols-3 gap-6">
        <!-- Export Options -->
        <div class="col-span-2 card">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Create Export</h2>

          <!-- Export Type Selection -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <button
              onclick={() => exportType = 'interior'}
              class="border-2 rounded-xl p-4 text-left transition-all
                {exportType === 'interior' ? 'border-spark-500 bg-spark-50' : 'border-gray-200 hover:border-gray-300'}"
            >
              <div class="text-2xl mb-2">📄</div>
              <div class="font-medium text-gray-900">Interior PDF</div>
              <div class="text-xs text-gray-500 mt-1">KDP-ready book interior with all pages</div>
            </button>

            <button
              onclick={() => exportType = 'cover'}
              class="border-2 rounded-xl p-4 text-left transition-all
                {exportType === 'cover' ? 'border-spark-500 bg-spark-50' : 'border-gray-200 hover:border-gray-300'}"
            >
              <div class="text-2xl mb-2">🖼️</div>
              <div class="font-medium text-gray-900">Cover PDF</div>
              <div class="text-xs text-gray-500 mt-1">Print-ready cover with spine</div>
            </button>
          </div>

          <!-- Export Settings -->
          <div class="space-y-4 mb-6">
            <div>
              <label for="trimSize" class="label">Trim Size</label>
              <select id="trimSize" bind:value={exportTrimSize} class="input">
                {#each Object.entries(TRIM_SIZES) as [key, size]}
                  <option value={key}>{size.name}</option>
                {/each}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="paperType" class="label">Paper Type</label>
                <select id="paperType" bind:value={exportPaperType} class="input">
                  <option value="white">White Paper</option>
                  <option value="cream">Cream Paper</option>
                </select>
              </div>

              <div>
                <label class="label">Bleed</label>
                <label class="flex items-center gap-2 mt-2">
                  <input type="checkbox" bind:checked={exportIncludeBleed} class="rounded border-gray-300" />
                  <span class="text-sm text-gray-700">Include 0.125" bleed</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Export Progress -->
          {#if exporting}
            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600">Generating PDF...</span>
                <span class="text-sm text-gray-500">{Math.round(exportProgress)}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-spark-500 h-2 rounded-full transition-all duration-300"
                  style="width: {exportProgress}%"
                ></div>
              </div>
            </div>
          {/if}

          <!-- Export Button -->
          <button
            onclick={handleExport}
            disabled={exporting || pages.length === 0}
            class="btn btn-primary w-full"
          >
            {#if exporting}
              <span class="animate-spin">⏳</span> Generating {exportType === 'interior' ? 'Interior' : 'Cover'} PDF...
            {:else}
              📥 Export {exportType === 'interior' ? 'Interior' : 'Cover'} PDF
            {/if}
          </button>

          {#if pages.length === 0}
            <p class="text-sm text-amber-600 mt-2 text-center">
              ⚠️ Add pages to your book before exporting
            </p>
          {/if}
        </div>

        <!-- KDP Specs Info -->
        <div class="space-y-4">
          <div class="card">
            <h3 class="text-sm font-medium text-gray-700 mb-3">KDP Specifications</h3>
            <div class="space-y-2 text-sm text-gray-600">
              <div class="flex justify-between">
                <span>Trim Size:</span>
                <span class="font-medium">{TRIM_SIZES[exportTrimSize as keyof typeof TRIM_SIZES]?.name || exportTrimSize}</span>
              </div>
              <div class="flex justify-between">
                <span>Page Count:</span>
                <span class="font-medium">{pages.length || book.pageCount || 24}</span>
              </div>
              <div class="flex justify-between">
                <span>Bleed:</span>
                <span class="font-medium">{exportIncludeBleed ? '0.125"' : 'None'}</span>
              </div>
              <div class="flex justify-between">
                <span>Paper:</span>
                <span class="font-medium capitalize">{exportPaperType}</span>
              </div>
            </div>
          </div>

          <div class="card bg-blue-50 border-blue-200">
            <h3 class="text-sm font-medium text-blue-800 mb-2">💡 Export Tips</h3>
            <ul class="text-xs text-blue-700 space-y-1">
              <li>• Use bleed for full-page illustrations</li>
              <li>• White paper is best for colorful books</li>
              <li>• Square format works great for picture books</li>
              <li>• Always preview before uploading to KDP</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Export History -->
      <div class="card mt-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Export History</h3>

        {#if exports.length === 0}
          <p class="text-gray-500 text-center py-6">No exports yet. Create your first export above!</p>
        {:else}
          <div class="space-y-3">
            {#each exports as exp (exp.id)}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="text-2xl">
                    {exp.status === 'completed' ? '✅' : exp.status === 'failed' ? '❌' : '⏳'}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">
                      {exp.format?.toUpperCase() || 'PDF'} Export
                    </div>
                    <div class="text-xs text-gray-500">
                      {new Date(exp.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  {#if exp.status === 'completed'}
                    <a
                      href={getExportDownloadUrl(exp.id)}
                      class="btn btn-primary text-sm"
                      download
                    >
                      📥 Download
                    </a>
                  {:else if exp.status === 'processing' || exp.status === 'pending'}
                    <span class="text-sm text-gray-500">Processing...</span>
                  {:else}
                    <span class="text-sm text-red-500">Failed</span>
                  {/if}

                  <button
                    onclick={() => handleDeleteExport(exp.id)}
                    class="text-gray-400 hover:text-red-500 p-1"
                    title="Delete export"
                  >
                    🗑️
                  </button>
                </div>
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
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Book?</h3>
        <p class="text-gray-600 mb-4">
          Are you sure you want to delete "{book.title}"? This action cannot be undone.
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
{/if}
