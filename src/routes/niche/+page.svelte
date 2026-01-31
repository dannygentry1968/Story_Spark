<script lang="ts">
  import { onMount } from 'svelte';
  import { getNiches, createNiche, deleteNiche } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';

  let niches: any[] = [];
  let loading = true;
  let showCreateModal = false;
  let showDetailModal = false;
  let selectedNiche: any = null;

  let formData = {
    name: '',
    category: '',
    demandLevel: 'medium',
    competitionLevel: 'medium',
    notes: '',
    keywords: ''
  };

  const demandLevels = [
    { id: 'low', name: 'Low', color: 'bg-red-100 text-red-700' },
    { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'high', name: 'High', color: 'bg-green-100 text-green-700' }
  ];

  const competitionLevels = [
    { id: 'low', name: 'Low', color: 'bg-green-100 text-green-700' },
    { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'high', name: 'High', color: 'bg-red-100 text-red-700' }
  ];

  const categories = [
    'Educational',
    'Entertainment',
    'Life Skills',
    'Animals & Nature',
    'Fantasy & Adventure',
    'Emotions & Feelings',
    'Holidays & Seasons',
    'STEM',
    'Arts & Crafts',
    'Sports & Activities',
    'Family & Relationships',
    'Other'
  ];

  onMount(async () => {
    await loadNiches();
  });

  async function loadNiches() {
    try {
      loading = true;
      niches = await getNiches();
    } catch (err) {
      console.error('Failed to load niches:', err);
      showError('Failed to load niches');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    formData = {
      name: '',
      category: '',
      demandLevel: 'medium',
      competitionLevel: 'medium',
      notes: '',
      keywords: ''
    };
    showCreateModal = true;
  }

  function openDetailModal(niche: any) {
    selectedNiche = niche;
    showDetailModal = true;
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      showError('Please enter a niche name');
      return;
    }

    try {
      const newNiche = await createNiche({
        name: formData.name.trim(),
        category: formData.category || null,
        demandLevel: formData.demandLevel,
        competitionLevel: formData.competitionLevel,
        notes: formData.notes.trim() || null,
        keywords: formData.keywords.trim() ? formData.keywords.split(',').map(k => k.trim()) : null
      });

      niches = [newNiche, ...niches];
      showCreateModal = false;
      showSuccess('Niche saved!');
    } catch (err) {
      console.error('Failed to save niche:', err);
      showError('Failed to save niche');
    }
  }

  async function handleDelete(niche: any) {
    if (!confirm(`Delete "${niche.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteNiche(niche.id);
      niches = niches.filter(n => n.id !== niche.id);
      showDetailModal = false;
      selectedNiche = null;
      showSuccess('Niche deleted');
    } catch (err) {
      console.error('Failed to delete niche:', err);
      showError('Failed to delete niche');
    }
  }

  function getDemandColor(level: string) {
    return demandLevels.find(l => l.id === level)?.color || 'bg-gray-100 text-gray-700';
  }

  function getCompetitionColor(level: string) {
    return competitionLevels.find(l => l.id === level)?.color || 'bg-gray-100 text-gray-700';
  }

  function getOpportunityScore(niche: any): { score: string; color: string } {
    // High demand + Low competition = Best opportunity
    const demandScore = { low: 1, medium: 2, high: 3 }[niche.demandLevel as string] || 2;
    const competitionScore = { low: 3, medium: 2, high: 1 }[niche.competitionLevel as string] || 2;
    const total = demandScore + competitionScore;

    if (total >= 5) return { score: 'Excellent', color: 'text-green-600' };
    if (total >= 4) return { score: 'Good', color: 'text-blue-600' };
    if (total >= 3) return { score: 'Fair', color: 'text-yellow-600' };
    return { score: 'Low', color: 'text-red-600' };
  }
</script>

<svelte:head>
  <title>Niche Research | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Niche Research</h1>
      <p class="text-gray-600">Discover profitable niches and book ideas</p>
    </div>
    <button onclick={openCreateModal} class="btn btn-primary">
      <span>+</span> Save New Niche
    </button>
  </div>

  <!-- Research Tools -->
  <div class="grid grid-cols-3 gap-6 mb-8">
    <div class="card">
      <div class="text-3xl mb-3">📊</div>
      <h3 class="font-semibold text-gray-900 mb-1">Trend Analysis</h3>
      <p class="text-sm text-gray-500 mb-4">AI-powered analysis of current KDP trends</p>
      <button onclick={() => showInfo('Trend analysis coming soon!')} class="btn btn-secondary text-sm w-full">Analyze Trends</button>
    </div>
    <div class="card">
      <div class="text-3xl mb-3">🎯</div>
      <h3 class="font-semibold text-gray-900 mb-1">Competition Check</h3>
      <p class="text-sm text-gray-500 mb-4">Evaluate competition in a specific niche</p>
      <button onclick={() => showInfo('Competition analysis coming soon!')} class="btn btn-secondary text-sm w-full">Check Competition</button>
    </div>
    <div class="card">
      <div class="text-3xl mb-3">💡</div>
      <h3 class="font-semibold text-gray-900 mb-1">Idea Generator</h3>
      <p class="text-sm text-gray-500 mb-4">AI-generated book ideas based on trends</p>
      <button onclick={() => showInfo('Idea generator coming soon!')} class="btn btn-secondary text-sm w-full">Generate Ideas</button>
    </div>
  </div>

  <!-- Saved Niches -->
  <div class="card">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Saved Niches</h2>

    {#if loading}
      <div class="space-y-4">
        {#each Array(3) as _}
          <div class="p-4 bg-gray-50 rounded-lg animate-pulse">
            <div class="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div class="h-4 bg-gray-100 rounded w-1/4"></div>
          </div>
        {/each}
      </div>
    {:else if niches.length === 0}
      <div class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">🔍</div>
        <p>No niches saved yet. Start researching to find profitable opportunities!</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each niches as niche (niche.id)}
          <div
            class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            onclick={() => openDetailModal(niche)}
          >
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">{niche.name}</h3>
                {#if niche.category}
                  <p class="text-sm text-gray-500">{niche.category}</p>
                {/if}
              </div>
              <div class="flex gap-2 items-center">
                <span class="px-2 py-1 {getDemandColor(niche.demandLevel)} text-xs rounded-full">
                  {niche.demandLevel} demand
                </span>
                <span class="px-2 py-1 {getCompetitionColor(niche.competitionLevel)} text-xs rounded-full">
                  {niche.competitionLevel} competition
                </span>
                {@const opportunity = getOpportunityScore(niche)}
                <span class="text-sm font-medium {opportunity.color}">
                  {opportunity.score}
                </span>
              </div>
            </div>
            {#if niche.notes}
              <p class="mt-2 text-sm text-gray-600 line-clamp-2">{niche.notes}</p>
            {/if}
            {#if niche.keywords?.length}
              <div class="mt-2 flex gap-1 flex-wrap">
                {#each niche.keywords.slice(0, 5) as keyword}
                  <span class="text-xs px-2 py-0.5 bg-white border rounded-full text-gray-600">{keyword}</span>
                {/each}
                {#if niche.keywords.length > 5}
                  <span class="text-xs text-gray-400">+{niche.keywords.length - 5} more</span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Create Niche Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold text-gray-900 mb-4">Save Niche Research</h3>

      <div class="space-y-4">
        <div>
          <label for="name" class="label">Niche Name <span class="text-red-500">*</span></label>
          <input
            id="name"
            type="text"
            bind:value={formData.name}
            placeholder="e.g., Bedtime Stories for Toddlers"
            class="input"
          />
        </div>

        <div>
          <label for="category" class="label">Category</label>
          <select id="category" bind:value={formData.category} class="input">
            <option value="">Select a category</option>
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="demand" class="label">Demand Level</label>
            <select id="demand" bind:value={formData.demandLevel} class="input">
              {#each demandLevels as level}
                <option value={level.id}>{level.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="competition" class="label">Competition Level</label>
            <select id="competition" bind:value={formData.competitionLevel} class="input">
              {#each competitionLevels as level}
                <option value={level.id}>{level.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <label for="keywords" class="label">Keywords (comma separated)</label>
          <input
            id="keywords"
            type="text"
            bind:value={formData.keywords}
            placeholder="bedtime, toddler, sleep, routine"
            class="input"
          />
        </div>

        <div>
          <label for="notes" class="label">Research Notes</label>
          <textarea
            id="notes"
            bind:value={formData.notes}
            placeholder="Key insights, competitor analysis, book ideas..."
            rows="4"
            class="input resize-none"
          ></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button onclick={() => showCreateModal = false} class="btn btn-secondary flex-1">
          Cancel
        </button>
        <button onclick={handleCreate} class="btn btn-primary flex-1">
          Save Niche
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Niche Detail Modal -->
{#if showDetailModal && selectedNiche}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">{selectedNiche.name}</h3>
          {#if selectedNiche.category}
            <p class="text-gray-500">{selectedNiche.category}</p>
          {/if}
        </div>
        <button onclick={() => showDetailModal = false} class="text-gray-400 hover:text-gray-600 text-xl">
          ✕
        </button>
      </div>

      <div class="space-y-4">
        <div class="flex gap-3">
          <div class="flex-1 p-3 bg-gray-50 rounded-lg text-center">
            <div class="text-sm text-gray-500 mb-1">Demand</div>
            <span class="px-3 py-1 {getDemandColor(selectedNiche.demandLevel)} text-sm rounded-full font-medium">
              {selectedNiche.demandLevel}
            </span>
          </div>
          <div class="flex-1 p-3 bg-gray-50 rounded-lg text-center">
            <div class="text-sm text-gray-500 mb-1">Competition</div>
            <span class="px-3 py-1 {getCompetitionColor(selectedNiche.competitionLevel)} text-sm rounded-full font-medium">
              {selectedNiche.competitionLevel}
            </span>
          </div>
          <div class="flex-1 p-3 bg-gray-50 rounded-lg text-center">
            <div class="text-sm text-gray-500 mb-1">Opportunity</div>
            {@const opp = getOpportunityScore(selectedNiche)}
            <span class="text-sm font-bold {opp.color}">{opp.score}</span>
          </div>
        </div>

        {#if selectedNiche.keywords?.length}
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">Keywords</h4>
            <div class="flex gap-2 flex-wrap">
              {#each selectedNiche.keywords as keyword}
                <span class="text-sm px-3 py-1 bg-spark-100 text-spark-700 rounded-full">{keyword}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedNiche.notes}
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">Research Notes</h4>
            <p class="text-gray-600 text-sm whitespace-pre-wrap">{selectedNiche.notes}</p>
          </div>
        {/if}

        <div class="text-xs text-gray-400">
          Created: {new Date(selectedNiche.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div class="flex gap-3 mt-6 pt-4 border-t">
        <button onclick={() => handleDelete(selectedNiche)} class="btn btn-secondary text-red-600 hover:bg-red-50">
          🗑️ Delete
        </button>
        <div class="flex-1"></div>
        <a href="/books/new" class="btn btn-primary">
          📚 Create Book in This Niche
        </a>
      </div>
    </div>
  </div>
{/if}
