<script lang="ts">
  import { onMount } from 'svelte';
  import { getAllSeries, createSeries, deleteSeries } from '$lib/api/client';
  import { showError, showSuccess } from '$lib/stores';

  let series: any[] = [];
  let loading = true;
  let showCreateModal = false;

  let formData = {
    name: '',
    description: '',
    targetAge: '',
    illustrationStyle: 'watercolor'
  };

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
      series = await getAllSeries();
    } catch (err) {
      console.error('Failed to load series:', err);
      showError('Failed to load series');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    formData = {
      name: '',
      description: '',
      targetAge: '',
      illustrationStyle: 'watercolor'
    };
    showCreateModal = true;
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      showError('Please enter a series name');
      return;
    }

    try {
      const newSeries = await createSeries({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        targetAge: formData.targetAge || null,
        illustrationStyle: formData.illustrationStyle
      });

      series = [newSeries, ...series];
      showCreateModal = false;
      showSuccess('Series created!');
    } catch (err) {
      console.error('Failed to create series:', err);
      showError('Failed to create series');
    }
  }

  async function handleDelete(s: any) {
    if (!confirm(`Delete "${s.name}"? Books in this series will NOT be deleted.`)) {
      return;
    }

    try {
      await deleteSeries(s.id);
      series = series.filter(item => item.id !== s.id);
      showSuccess('Series deleted');
    } catch (err) {
      console.error('Failed to delete series:', err);
      showError('Failed to delete series');
    }
  }
</script>

<svelte:head>
  <title>Series | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Series</h1>
      <p class="text-gray-600">Group related books for consistent branding and characters</p>
    </div>
    <button onclick={openCreateModal} class="btn btn-primary">
      <span>+</span> New Series
    </button>
  </div>

  {#if loading}
    <div class="grid grid-cols-3 gap-6">
      {#each Array(3) as _}
        <div class="card animate-pulse">
          <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-gray-100 rounded w-full mb-4"></div>
          <div class="flex gap-4">
            <div class="h-4 bg-gray-100 rounded w-20"></div>
            <div class="h-4 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if series.length === 0}
    <div class="card text-center py-16">
      <div class="text-6xl mb-4">📖</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No series yet</h2>
      <p class="text-gray-600 mb-6">Create a series to group related books and maintain character consistency</p>
      <button onclick={openCreateModal} class="btn btn-primary">Create Your First Series</button>
    </div>
  {:else}
    <div class="grid grid-cols-3 gap-6">
      {#each series as s (s.id)}
        <div class="card hover:shadow-md transition-shadow group">
          <div class="flex items-start justify-between">
            <a href="/series/{s.id}" class="flex-1">
              <h3 class="font-semibold text-gray-900 text-lg hover:text-spark-600">{s.name}</h3>
            </a>
            <button
              onclick={() => handleDelete(s)}
              class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete series"
            >
              🗑️
            </button>
          </div>

          {#if s.description}
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{s.description}</p>
          {/if}

          <div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span>📚 {s.bookCount || 0} books</span>
            <span>👤 {s.characterCount || 0} characters</span>
          </div>

          {#if s.illustrationStyle}
            <div class="mt-2">
              <span class="text-xs px-2 py-1 bg-spark-100 text-spark-700 rounded-full">
                🎨 {illustrationStyles.find(st => st.id === s.illustrationStyle)?.name || s.illustrationStyle}
              </span>
            </div>
          {/if}

          <a href="/series/{s.id}" class="mt-4 text-sm text-spark-600 hover:text-spark-700 inline-block">
            View Series →
          </a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Series Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl p-6 max-w-lg w-full">
      <h3 class="text-xl font-semibold text-gray-900 mb-4">Create Series</h3>

      <div class="space-y-4">
        <div>
          <label for="name" class="label">Series Name <span class="text-red-500">*</span></label>
          <input
            id="name"
            type="text"
            bind:value={formData.name}
            placeholder="e.g., The Adventures of Finley Fox"
            class="input"
          />
        </div>

        <div>
          <label for="description" class="label">Description</label>
          <textarea
            id="description"
            bind:value={formData.description}
            placeholder="What is this series about? Who is it for?"
            rows="3"
            class="input resize-none"
          ></textarea>
        </div>

        <div>
          <label for="style" class="label">Illustration Style</label>
          <select id="style" bind:value={formData.illustrationStyle} class="input">
            {#each illustrationStyles as style}
              <option value={style.id}>{style.name}</option>
            {/each}
          </select>
          <p class="text-xs text-gray-500 mt-1">All books in this series will use this illustration style for consistency.</p>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button onclick={() => showCreateModal = false} class="btn btn-secondary flex-1">
          Cancel
        </button>
        <button onclick={handleCreate} class="btn btn-primary flex-1">
          Create Series
        </button>
      </div>
    </div>
  </div>
{/if}
