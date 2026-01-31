<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { BOOK_TYPES, AGE_RANGES, TRIM_SIZES, type BookTypeId, type AgeRange } from '$lib/types';

  const urlParams = $page.url.searchParams;
  let selectedType: BookTypeId = (urlParams.get('type') as BookTypeId) || 'picture';

  let formData = {
    title: '',
    bookType: selectedType,
    targetAge: '' as AgeRange,
    concept: '',
    trimSize: '8.5x8.5'
  };

  $: bookTypeInfo = BOOK_TYPES[formData.bookType];
  $: availableAges = bookTypeInfo?.ages || [];
  $: availableTrimSizes = bookTypeInfo?.trimSizes || [];

  async function handleSubmit() {
    // TODO: Create book via API
    console.log('Creating book:', formData);
    // goto(`/books/${newBookId}`);
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
    </div>

    <!-- Basic Info -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

      <div class="space-y-4">
        <div>
          <label for="title" class="label">Book Title</label>
          <input
            id="title"
            type="text"
            bind:value={formData.title}
            placeholder="Enter your book title"
            class="input"
            required
          />
        </div>

        <div>
          <label for="age" class="label">Target Age</label>
          <select id="age" bind:value={formData.targetAge} class="input" required>
            <option value="">Select age range</option>
            {#each availableAges as age}
              <option value={age}>{AGE_RANGES[age].label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="trim" class="label">Trim Size</label>
          <select id="trim" bind:value={formData.trimSize} class="input">
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
          placeholder="Describe your book idea, theme, or main characters..."
          rows="4"
          class="input resize-none"
        ></textarea>
        <p class="mt-2 text-sm text-gray-500">
          This will be used to help AI generate your story outline and content.
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4">
      <a href="/books" class="btn btn-secondary flex-1">Cancel</a>
      <button type="submit" class="btn btn-primary flex-1">
        Create Book
      </button>
    </div>
  </form>
</div>
