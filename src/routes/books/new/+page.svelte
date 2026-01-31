<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { BOOK_TYPES, AGE_RANGES, type BookTypeId, type AgeRange } from '$lib/types';
  import { createBook } from '$lib/api/client';
  import { showError, showSuccess } from '$lib/stores';

  const urlParams = $page.url.searchParams;
  let selectedType: BookTypeId = (urlParams.get('type') as BookTypeId) || 'picture';

  let formData = {
    title: '',
    bookType: selectedType,
    targetAge: '' as AgeRange,
    concept: '',
    trimSize: '8.5x8.5'
  };

  let submitting = false;

  $: bookTypeInfo = BOOK_TYPES[formData.bookType];
  $: availableAges = bookTypeInfo?.ages || [];
  $: availableTrimSizes = bookTypeInfo?.trimSizes || [];

  // Reset age when book type changes if current age isn't available
  $: if (formData.targetAge && !availableAges.includes(formData.targetAge)) {
    formData.targetAge = '' as AgeRange;
  }

  // Set default trim size when book type changes
  $: if (availableTrimSizes.length && !availableTrimSizes.includes(formData.trimSize)) {
    formData.trimSize = availableTrimSizes[0];
  }

  async function handleSubmit() {
    if (!formData.title.trim()) {
      showError('Please enter a book title');
      return;
    }
    if (!formData.targetAge) {
      showError('Please select a target age range');
      return;
    }

    try {
      submitting = true;
      const book = await createBook({
        title: formData.title.trim(),
        bookType: formData.bookType,
        targetAge: formData.targetAge,
        concept: formData.concept.trim() || null,
        trimSize: formData.trimSize,
        pageCount: bookTypeInfo?.pageCount
      });

      showSuccess('Book created!');
      goto(`/books/${book.id}`);
    } catch (err) {
      console.error('Failed to create book:', err);
      showError('Failed to create book. Please try again.');
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Book | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-3xl mx-auto">
  <div class="mb-8">
    <a href="/books" class="text-spark-600 hover:text-spark-700 text-sm mb-2 inline-block">← Back to Books</a>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Create New Book</h1>
    <p class="text-gray-600">Start a new book project</p>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
    <!-- Book Type Selection -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Book Type</h2>
      <div class="grid grid-cols-5 gap-3">
        {#each Object.values(BOOK_TYPES) as type}
          <button
            type="button"
            onclick={() => formData.bookType = type.id as BookTypeId}
            class="p-4 border rounded-xl text-center transition-all
              {formData.bookType === type.id
                ? 'border-spark-500 bg-spark-50 ring-2 ring-spark-500'
                : 'border-gray-200 hover:border-gray-300'}"
          >
            <div class="text-2xl mb-1">{type.icon}</div>
            <div class="text-sm font-medium text-gray-900">{type.name}</div>
          </button>
        {/each}
      </div>
      <p class="mt-3 text-sm text-gray-500">{bookTypeInfo?.description}</p>
      <div class="mt-2 flex gap-4 text-xs text-gray-400">
        <span>{bookTypeInfo?.pageCount} pages</span>
        <span>Ages: {availableAges.map(a => AGE_RANGES[a]?.label.split(' ')[0]).join(', ')}</span>
      </div>
    </div>

    <!-- Basic Info -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

      <div class="space-y-4">
        <div>
          <label for="title" class="label">Book Title <span class="text-red-500">*</span></label>
          <input
            id="title"
            type="text"
            bind:value={formData.title}
            placeholder="Enter your book title"
            class="input"
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label for="age" class="label">Target Age <span class="text-red-500">*</span></label>
          <select id="age" bind:value={formData.targetAge} class="input" required disabled={submitting}>
            <option value="">Select age range</option>
            {#each availableAges as age}
              <option value={age}>{AGE_RANGES[age].label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="trim" class="label">Trim Size</label>
          <select id="trim" bind:value={formData.trimSize} class="input" disabled={submitting}>
            {#each availableTrimSizes as size}
              <option value={size}>{size}"</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Concept -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Book Concept</h2>
      <div>
        <label for="concept" class="label">What's your book about?</label>
        <textarea
          id="concept"
          bind:value={formData.concept}
          placeholder="Describe your book idea, theme, or main characters...

Example: A curious little fox named Finley who discovers that the best adventures are the ones shared with friends. Set in an enchanted forest with talking animals and magical creatures."
          rows="5"
          class="input resize-none"
          disabled={submitting}
        ></textarea>
        <p class="mt-2 text-sm text-gray-500">
          This will be used to help AI generate your story outline and content. The more detail you provide, the better!
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4">
      <a href="/books" class="btn btn-secondary flex-1" class:pointer-events-none={submitting}>
        Cancel
      </a>
      <button
        type="submit"
        class="btn btn-primary flex-1"
        disabled={submitting || !formData.title.trim() || !formData.targetAge}
      >
        {#if submitting}
          <span class="animate-spin">⏳</span> Creating...
        {:else}
          Create Book
        {/if}
      </button>
    </div>
  </form>
</div>
