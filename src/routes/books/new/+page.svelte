<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { BOOK_TYPES, AGE_RANGES } from '$lib/types';
  import { TRIM_SIZES } from '$lib/services/pdf-export';
  import { createBook, getAllSeries, getCharacters, generateOutline } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';

  // Wizard steps
  const STEPS = [
    { id: 'concept', label: 'Concept', icon: '💡' },
    { id: 'details', label: 'Details', icon: '📋' },
    { id: 'characters', label: 'Characters', icon: '👤' },
    { id: 'outline', label: 'Outline', icon: '📝' },
    { id: 'review', label: 'Review', icon: '✅' }
  ];

  let currentStep = 0;
  let loading = false;
  let generatingOutline = false;

  // Data from API
  let allSeries: any[] = [];
  let allCharacters: any[] = [];

  // Form data
  let bookData = {
    // Step 1: Concept
    title: '',
    concept: '',
    themes: [] as string[],
    newTheme: '',

    // Step 2: Details
    bookType: 'picture',
    targetAge: '3-5',
    trimSize: '8.5x8.5',
    pageCount: 24,
    seriesId: '',

    // Step 3: Characters
    selectedCharacters: [] as string[],

    // Step 4: Outline
    outline: '',
    pages: [] as { pageNumber: number; outline: string }[]
  };

  // Validation state
  let errors: Record<string, string> = {};

  onMount(async () => {
    try {
      // Read URL parameters to populate form (from Niche Research suggestions)
      const urlParams = $page.url.searchParams;
      const urlTitle = urlParams.get('title');
      const urlConcept = urlParams.get('concept');

      if (urlTitle) {
        bookData.title = urlTitle;
      }
      if (urlConcept) {
        bookData.concept = urlConcept;
      }

      const [seriesData, charactersData] = await Promise.all([
        getAllSeries().catch(() => []),
        getCharacters().catch(() => [])
      ]);
      allSeries = seriesData;
      allCharacters = charactersData;
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  });

  function validateStep(step: number): boolean {
    errors = {};

    switch (step) {
      case 0: // Concept
        if (!bookData.title.trim()) {
          errors.title = 'Title is required';
        }
        if (!bookData.concept.trim()) {
          errors.concept = 'Concept is required';
        } else if (bookData.concept.trim().length < 20) {
          errors.concept = 'Please provide more detail (at least 20 characters)';
        }
        break;

      case 1: // Details
        if (!bookData.bookType) {
          errors.bookType = 'Please select a book type';
        }
        if (!bookData.targetAge) {
          errors.targetAge = 'Please select a target age';
        }
        break;

      case 2: // Characters (optional)
        // No required fields
        break;

      case 3: // Outline
        if (!bookData.outline.trim() && bookData.pages.length === 0) {
          errors.outline = 'Please generate or write an outline';
        }
        break;
    }

    return Object.keys(errors).length === 0;
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        currentStep++;
      }
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  function goToStep(step: number) {
    // Only allow going back or to completed steps
    if (step <= currentStep) {
      currentStep = step;
    }
  }

  function addTheme() {
    if (bookData.newTheme.trim() && !bookData.themes.includes(bookData.newTheme.trim())) {
      bookData.themes = [...bookData.themes, bookData.newTheme.trim()];
      bookData.newTheme = '';
    }
  }

  function removeTheme(theme: string) {
    bookData.themes = bookData.themes.filter(t => t !== theme);
  }

  function toggleCharacter(characterId: string) {
    if (bookData.selectedCharacters.includes(characterId)) {
      bookData.selectedCharacters = bookData.selectedCharacters.filter(id => id !== characterId);
    } else {
      bookData.selectedCharacters = [...bookData.selectedCharacters, characterId];
    }
  }

  async function handleGenerateOutline() {
    if (!bookData.concept.trim()) {
      showError('Please enter a concept first');
      return;
    }

    try {
      generatingOutline = true;
      showInfo('Generating story outline with AI...');

      const selectedChars = allCharacters.filter(c => bookData.selectedCharacters.includes(c.id));

      const result = await generateOutline({
        bookType: bookData.bookType,
        targetAge: bookData.targetAge,
        concept: bookData.concept,
        themes: bookData.themes,
        characters: selectedChars.map(c => ({
          name: c.name,
          description: c.visualDescription || c.description || ''
        }))
      });

      // Parse the outline into pages
      // Claude returns 'logline' for the summary
      bookData.outline = result.logline || result.summary || '';
      // Map Claude's page structure (summary field) to our structure (outline field)
      bookData.pages = (result.pages || []).map(p => ({
        pageNumber: p.pageNumber,
        outline: p.summary || p.outline || p.text || ''
      }));

      showSuccess('Outline generated!');
    } catch (err) {
      console.error('Failed to generate outline:', err);
      showError('Failed to generate outline');
    } finally {
      generatingOutline = false;
    }
  }

  async function handleCreate() {
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      loading = true;
      showInfo('Creating your book...');

      const newBook = await createBook({
        title: bookData.title.trim(),
        concept: bookData.concept.trim(),
        bookType: bookData.bookType,
        targetAge: bookData.targetAge,
        trimSize: bookData.trimSize,
        pageCount: bookData.pageCount,
        seriesId: bookData.seriesId || null,
        outline: bookData.outline,
        status: 'draft'
      });

      // If we have pages from the outline, save them to the book
      if (bookData.pages.length > 0) {
        try {
          const { updateBookPages } = await import('$lib/api/client');
          await updateBookPages(newBook.id, bookData.pages.map(p => ({
            pageNumber: p.pageNumber,
            pageType: 'content',
            illustrationPrompt: p.outline, // Use outline as illustration prompt
            text: null,
            layout: 'text_bottom'
          })));
        } catch (pageErr) {
          console.error('Failed to save pages:', pageErr);
          // Continue anyway - book was created
        }
      }

      showSuccess('Book created successfully!');
      goto(\`/books/\${newBook.id}\`);
    } catch (err) {
      console.error('Failed to create book:', err);
      showError('Failed to create book');
    } finally {
      loading = false;
    }
  }

  $: selectedCharacterObjects = allCharacters.filter(c => bookData.selectedCharacters.includes(c.id));
  $: bookTypeInfo = BOOK_TYPES[bookData.bookType as keyof typeof BOOK_TYPES];
  $: ageInfo = AGE_RANGES[bookData.targetAge as keyof typeof AGE_RANGES];
  $: trimInfo = TRIM_SIZES[bookData.trimSize as keyof typeof TRIM_SIZES];
</script>

<svelte:head>
  <title>Create New Book | StorySpark</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b">
    <div class="max-w-4xl mx-auto px-8 py-6">
      <a href="/books" class="text-spark-600 hover:text-spark-700 text-sm mb-2 inline-block">← Back to Books</a>
      <h1 class="text-2xl font-bold text-gray-900">Create New Book</h1>
      <p class="text-gray-500 mt-1">Follow the wizard to create your children's book</p>
    </div>
  </div>

  <!-- Progress Steps -->
  <div class="bg-white border-b">
    <div class="max-w-4xl mx-auto px-8 py-4">
      <div class="flex items-center justify-between">
        {#each STEPS as step, i}
          <button
            onclick={() => goToStep(i)}
            disabled={i > currentStep}
            class="flex items-center gap-2 group"
          >
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors
              {i < currentStep
                ? 'bg-green-500 text-white'
                : i === currentStep
                  ? 'bg-spark-500 text-white'
                  : 'bg-gray-200 text-gray-400'}"
            >
              {#if i < currentStep}
                ✓
              {:else}
                {step.icon}
              {/if}
            </div>
            <span class="text-sm font-medium hidden sm:block
              {i <= currentStep ? 'text-gray-900' : 'text-gray-400'}">
              {step.label}
            </span>
          </button>
          {#if i < STEPS.length - 1}
            <div class="flex-1 h-0.5 mx-2
              {i < currentStep ? 'bg-green-500' : 'bg-gray-200'}">
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Step Content -->
  <div class="max-w-4xl mx-auto px-8 py-8">
    <!-- Step 1: Concept -->
    {#if currentStep === 0}
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">💡 What's Your Book About?</h2>
        <p class="text-gray-500 mb-6">Start with your book idea - don't worry about being perfect!</p>

        <div class="space-y-6">
          <div>
            <label for="title" class="label">Book Title <span class="text-red-500">*</span></label>
            <input
              id="title"
              type="text"
              bind:value={bookData.title}
              placeholder="e.g., The Little Fox Who Found Her Courage"
              class="input"
              class:border-red-500={errors.title}
            />
            {#if errors.title}
              <p class="text-red-500 text-sm mt-1">{errors.title}</p>
            {/if}
          </div>

          <div>
            <label for="concept" class="label">Book Concept <span class="text-red-500">*</span></label>
            <textarea
              id="concept"
              bind:value={bookData.concept}
              rows="5"
              placeholder="Describe your book idea: What happens? What's the message? What makes it special?

Example: A shy little fox named Finley is afraid to explore beyond her cozy den. When her best friend gets lost in the forest, Finley must overcome her fears to save him. Along the way, she discovers that courage isn't about not being scared - it's about doing what matters even when you are."
              class="input"
              class:border-red-500={errors.concept}
            ></textarea>
            {#if errors.concept}
              <p class="text-red-500 text-sm mt-1">{errors.concept}</p>
            {:else}
              <p class="text-xs text-gray-500 mt-1">{bookData.concept.length} characters - the more detail, the better the AI outline!</p>
            {/if}
          </div>

          <div>
            <label class="label">Themes (optional)</label>
            <div class="flex gap-2 mb-2">
              <input
                type="text"
                bind:value={bookData.newTheme}
                placeholder="Add a theme..."
                class="input flex-1"
                onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTheme())}
              />
              <button onclick={addTheme} class="btn btn-secondary">Add</button>
            </div>
            <div class="flex flex-wrap gap-2">
              {#each bookData.themes as theme}
                <span class="inline-flex items-center gap-1 px-3 py-1 bg-spark-100 text-spark-700 rounded-full text-sm">
                  {theme}
                  <button onclick={() => removeTheme(theme)} class="hover:text-spark-900">×</button>
                </span>
              {/each}
              {#if bookData.themes.length === 0}
                <span class="text-sm text-gray-400">Examples: friendship, courage, kindness, adventure</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

    <!-- Step 2: Details -->
    {:else if currentStep === 1}
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">📋 Book Details</h2>
        <p class="text-gray-500 mb-6">Configure the specifications for your book</p>

        <div class="space-y-6">
          <div>
            <label class="label">Book Type <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-3 gap-3">
              {#each Object.entries(BOOK_TYPES) as [key, type]}
                <button
                  onclick={() => bookData.bookType = key}
                  class="border-2 rounded-xl p-4 text-left transition-all
                    {bookData.bookType === key
                      ? 'border-spark-500 bg-spark-50'
                      : 'border-gray-200 hover:border-gray-300'}"
                >
                  <div class="text-2xl mb-1">{type.icon}</div>
                  <div class="font-medium text-gray-900 text-sm">{type.name}</div>
                  <div class="text-xs text-gray-500">{type.pages} pages typical</div>
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="label">Target Age <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-4 gap-3">
              {#each Object.entries(AGE_RANGES) as [key, age]}
                <button
                  onclick={() => bookData.targetAge = key}
                  class="border-2 rounded-xl p-3 text-center transition-all
                    {bookData.targetAge === key
                      ? 'border-spark-500 bg-spark-50'
                      : 'border-gray-200 hover:border-gray-300'}"
                >
                  <div class="font-medium text-gray-900">{age.label}</div>
                  <div class="text-xs text-gray-500">{age.description}</div>
                </button>
              {/each}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label for="trimSize" class="label">Trim Size</label>
              <select id="trimSize" bind:value={bookData.trimSize} class="input">
                {#each Object.entries(TRIM_SIZES) as [key, size]}
                  <option value={key}>{size.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="pageCount" class="label">Page Count</label>
              <select id="pageCount" bind:value={bookData.pageCount} class="input">
                <option value={16}>16 pages</option>
                <option value={24}>24 pages</option>
                <option value={32}>32 pages</option>
                <option value={40}>40 pages</option>
                <option value={48}>48 pages</option>
              </select>
            </div>
          </div>

          <div>
            <label for="series" class="label">Add to Series (optional)</label>
            <select id="series" bind:value={bookData.seriesId} class="input">
              <option value="">No series</option>
              {#each allSeries as series}
                <option value={series.id}>{series.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

    <!-- Step 3: Characters -->
    {:else if currentStep === 2}
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">👤 Characters</h2>
        <p class="text-gray-500 mb-6">Select characters to include in your book (optional)</p>

        {#if allCharacters.length === 0}
          <div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <div class="text-4xl mb-2">👤</div>
            <p class="text-gray-500 mb-4">No characters created yet</p>
            <a href="/characters" class="text-spark-600 hover:text-spark-700">
              Create characters in the Character Bible →
            </a>
          </div>
        {:else}
          <div class="grid grid-cols-4 gap-4">
            {#each allCharacters as character}
              <button
                onclick={() => toggleCharacter(character.id)}
                class="border-2 rounded-xl p-3 text-left transition-all
                  {bookData.selectedCharacters.includes(character.id)
                    ? 'border-spark-500 bg-spark-50'
                    : 'border-gray-200 hover:border-gray-300'}"
              >
                <div class="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                  {#if character.referenceImagePath}
                    <img src={character.referenceImagePath} alt={character.name} class="w-full h-full object-cover" />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center text-gray-400">
                      <span class="text-3xl">👤</span>
                    </div>
                  {/if}
                </div>
                <div class="font-medium text-gray-900 text-sm truncate">{character.name}</div>
                {#if character.role}
                  <div class="text-xs text-gray-500 truncate">{character.role}</div>
                {/if}
                {#if bookData.selectedCharacters.includes(character.id)}
                  <div class="text-xs text-spark-600 mt-1">✓ Selected</div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if bookData.selectedCharacters.length > 0}
          <div class="mt-6 p-4 bg-spark-50 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Selected Characters ({bookData.selectedCharacters.length})</h4>
            <div class="flex flex-wrap gap-2">
              {#each selectedCharacterObjects as char}
                <span class="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border">
                  {char.name}
                  <button onclick={() => toggleCharacter(char.id)} class="text-gray-400 hover:text-gray-600">×</button>
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>

    <!-- Step 4: Outline -->
    {:else if currentStep === 3}
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">📝 Story Outline</h2>
        <p class="text-gray-500 mb-6">Generate an AI outline or write your own</p>

        <div class="space-y-6">
          <!-- Generate Button -->
          <div class="flex items-center justify-between p-4 bg-gradient-to-r from-spark-50 to-purple-50 rounded-lg border border-spark-200">
            <div>
              <h4 class="font-medium text-gray-900">✨ AI-Powered Outline</h4>
              <p class="text-sm text-gray-500">Let AI create a story outline based on your concept</p>
            </div>
            <button
              onclick={handleGenerateOutline}
              disabled={generatingOutline || !bookData.concept.trim()}
              class="btn btn-primary"
            >
              {#if generatingOutline}
                <span class="animate-spin">⏳</span> Generating...
              {:else}
                ✨ Generate Outline
              {/if}
            </button>
          </div>

          <!-- Outline Text -->
          <div>
            <label for="outline" class="label">Story Summary</label>
            <textarea
              id="outline"
              bind:value={bookData.outline}
              rows="4"
              placeholder="A brief summary of the story..."
              class="input"
              class:border-red-500={errors.outline}
            ></textarea>
          </div>

          <!-- Page Breakdown -->
          {#if bookData.pages.length > 0}
            <div>
              <h4 class="font-medium text-gray-900 mb-3">Page-by-Page Breakdown</h4>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                {#each bookData.pages as page, i}
                  <div class="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-8 h-8 rounded-full bg-spark-100 text-spark-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {page.pageNumber}
                    </div>
                    <div class="flex-1">
                      <textarea
                        bind:value={bookData.pages[i].outline}
                        rows="2"
                        class="input text-sm"
                      ></textarea>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <p class="text-gray-500">Generate an outline to see the page breakdown</p>
            </div>
          {/if}

          {#if errors.outline}
            <p class="text-red-500 text-sm">{errors.outline}</p>
          {/if}
        </div>
      </div>

    <!-- Step 5: Review -->
    {:else if currentStep === 4}
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">✅ Review Your Book</h2>
        <p class="text-gray-500 mb-6">Review the details before creating your book</p>

        <div class="space-y-6">
          <!-- Book Summary -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Title</h4>
              <p class="text-lg font-semibold text-gray-900">{bookData.title}</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Type</h4>
              <p class="text-gray-900">{bookTypeInfo?.icon} {bookTypeInfo?.name}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-6">
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Target Age</h4>
              <p class="text-gray-900">{ageInfo?.label}</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Trim Size</h4>
              <p class="text-gray-900">{trimInfo?.name}</p>
            </div>
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Pages</h4>
              <p class="text-gray-900">{bookData.pageCount} pages</p>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">Concept</h4>
            <p class="text-gray-700 bg-gray-50 p-3 rounded-lg">{bookData.concept}</p>
          </div>

          {#if bookData.themes.length > 0}
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Themes</h4>
              <div class="flex flex-wrap gap-2">
                {#each bookData.themes as theme}
                  <span class="px-3 py-1 bg-spark-100 text-spark-700 rounded-full text-sm">{theme}</span>
                {/each}
              </div>
            </div>
          {/if}

          {#if selectedCharacterObjects.length > 0}
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Characters</h4>
              <div class="flex flex-wrap gap-2">
                {#each selectedCharacterObjects as char}
                  <span class="px-3 py-1 bg-gray-100 rounded-full text-sm">{char.name}</span>
                {/each}
              </div>
            </div>
          {/if}

          {#if bookData.outline}
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Story Outline</h4>
              <p class="text-gray-700 bg-gray-50 p-3 rounded-lg">{bookData.outline}</p>
            </div>
          {/if}

          {#if bookData.pages.length > 0}
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">Pages Planned</h4>
              <p class="text-gray-900">{bookData.pages.length} pages outlined</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Navigation Buttons -->
    <div class="flex items-center justify-between mt-8">
      <button
        onclick={prevStep}
        disabled={currentStep === 0}
        class="btn btn-secondary"
        class:opacity-50={currentStep === 0}
      >
        ← Previous
      </button>

      <div class="text-sm text-gray-500">
        Step {currentStep + 1} of {STEPS.length}
      </div>

      {#if currentStep < STEPS.length - 1}
        <button onclick={nextStep} class="btn btn-primary">
          Next →
        </button>
      {:else}
        <button
          onclick={handleCreate}
          disabled={loading}
          class="btn btn-primary bg-green-600 hover:bg-green-700"
        >
          {#if loading}
            <span class="animate-spin">⏳</span> Creating...
          {:else}
            🚀 Create Book
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>
