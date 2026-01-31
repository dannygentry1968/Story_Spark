<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getNiches,
    createNiche,
    deleteNiche,
    updateNiche,
    analyzeNiche,
    type NicheAnalysisResponse,
    type TrendData,
    type CompetitionData,
    type BookIdeaData
  } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';
  import { AGE_RANGES } from '$lib/types';

  let niches: any[] = [];
  let loading = true;
  let showCreateModal = false;
  let showDetailModal = false;
  let selectedNiche: any = null;

  // Research state
  let researchQuery = '';
  let researchCategory = '';
  let researchAge = '';
  let isAnalyzing = false;
  let analysisResult: NicheAnalysisResponse | null = null;
  let activeTab: 'research' | 'saved' = 'research';
  let analysisType: 'trends' | 'competition' | 'ideas' | 'full' = 'full';

  let formData = {
    name: '',
    category: '',
    demandLevel: 'medium',
    competitionLevel: 'medium',
    notes: '',
    keywords: '',
    bookIdeas: ''
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

  async function runAnalysis() {
    if (!researchQuery.trim()) {
      showError('Please enter a topic to research');
      return;
    }

    try {
      isAnalyzing = true;
      analysisResult = null;

      analysisResult = await analyzeNiche({
        query: researchQuery.trim(),
        analysisType,
        category: researchCategory || undefined,
        targetAge: researchAge || undefined
      });

      showSuccess('Analysis complete!');
    } catch (err) {
      console.error('Analysis failed:', err);
      showError('Failed to analyze niche. Please check your API key in Settings.');
    } finally {
      isAnalyzing = false;
    }
  }

  function saveFromAnalysis() {
    if (!analysisResult) return;

    // Pre-fill form from analysis
    formData = {
      name: researchQuery,
      category: researchCategory || categories[0],
      demandLevel: analysisResult.opportunityScore >= 70 ? 'high' : analysisResult.opportunityScore >= 40 ? 'medium' : 'low',
      competitionLevel: analysisResult.competition?.level || 'medium',
      notes: analysisResult.summary + '\n\n' + analysisResult.recommendations.join('\n'),
      keywords: analysisResult.trends?.map(t => t.topic).join(', ') || '',
      bookIdeas: analysisResult.bookIdeas?.map(i => `${i.title}: ${i.concept}`).join('\n\n') || ''
    };

    showCreateModal = true;
  }

  function openCreateModal() {
    formData = {
      name: '',
      category: '',
      demandLevel: 'medium',
      competitionLevel: 'medium',
      notes: '',
      keywords: '',
      bookIdeas: ''
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
        keywords: formData.keywords.trim() ? formData.keywords.split(',').map(k => k.trim()) : null,
        bookIdeas: formData.bookIdeas.trim() ? formData.bookIdeas.split('\n\n').filter(i => i.trim()) : null
      });

      niches = [newNiche, ...niches];
      showCreateModal = false;
      showSuccess('Niche saved!');
      activeTab = 'saved';
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

  function getTrendColor(level: string) {
    const colors: Record<string, string> = {
      rising: 'text-green-600 bg-green-100',
      stable: 'text-blue-600 bg-blue-100',
      declining: 'text-red-600 bg-red-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
  }

  function getTrendIcon(level: string) {
    const icons: Record<string, string> = {
      rising: '📈',
      stable: '➡️',
      declining: '📉'
    };
    return icons[level] || '•';
  }

  function getOpportunityScore(niche: any): { score: string; color: string } {
    const demandScore = { low: 1, medium: 2, high: 3 }[niche.demandLevel as string] || 2;
    const competitionScore = { low: 3, medium: 2, high: 1 }[niche.competitionLevel as string] || 2;
    const total = demandScore + competitionScore;

    if (total >= 5) return { score: 'Excellent', color: 'text-green-600' };
    if (total >= 4) return { score: 'Good', color: 'text-blue-600' };
    if (total >= 3) return { score: 'Fair', color: 'text-yellow-600' };
    return { score: 'Low', color: 'text-red-600' };
  }

  function getScoreColor(score: number): string {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-blue-600 bg-blue-100';
    if (score >= 30) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }
</script>

<svelte:head>
  <title>Niche Research | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Niche Research</h1>
      <p class="text-gray-600">Discover profitable niches and book ideas with AI-powered analysis</p>
    </div>
    <button onclick={openCreateModal} class="btn btn-secondary">
      <span>+</span> Save Niche Manually
    </button>
  </div>

  <!-- Tab Navigation -->
  <div class="flex gap-4 mb-6 border-b">
    <button
      onclick={() => activeTab = 'research'}
      class="pb-2 px-1 font-medium transition-colors {activeTab === 'research' ? 'text-spark-600 border-b-2 border-spark-600' : 'text-gray-500 hover:text-gray-700'}"
    >
      🔍 Research Tool
    </button>
    <button
      onclick={() => activeTab = 'saved'}
      class="pb-2 px-1 font-medium transition-colors {activeTab === 'saved' ? 'text-spark-600 border-b-2 border-spark-600' : 'text-gray-500 hover:text-gray-700'}"
    >
      📁 Saved Niches ({niches.length})
    </button>
  </div>

  {#if activeTab === 'research'}
    <!-- Research Tool -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Research Input -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">🔍 Research Topic</h2>

        <div class="space-y-4">
          <div>
            <label for="query" class="label">What do you want to research?</label>
            <input
              id="query"
              type="text"
              bind:value={researchQuery}
              placeholder="e.g., bedtime stories, dinosaurs, emotions..."
              class="input"
              onkeydown={(e) => e.key === 'Enter' && runAnalysis()}
            />
          </div>

          <div>
            <label for="category" class="label">Category (optional)</label>
            <select id="category" bind:value={researchCategory} class="input">
              <option value="">Any category</option>
              {#each categories as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="age" class="label">Target Age (optional)</label>
            <select id="age" bind:value={researchAge} class="input">
              <option value="">Any age</option>
              {#each Object.entries(AGE_RANGES) as [key, range]}
                <option value={key}>{range.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="label">Analysis Type</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                onclick={() => analysisType = 'full'}
                class="p-2 text-sm rounded-lg border transition-colors {analysisType === 'full' ? 'bg-spark-100 border-spark-300 text-spark-700' : 'bg-white border-gray-200 hover:border-gray-300'}"
              >
                🎯 Full Analysis
              </button>
              <button
                onclick={() => analysisType = 'trends'}
                class="p-2 text-sm rounded-lg border transition-colors {analysisType === 'trends' ? 'bg-spark-100 border-spark-300 text-spark-700' : 'bg-white border-gray-200 hover:border-gray-300'}"
              >
                📈 Trends Only
              </button>
              <button
                onclick={() => analysisType = 'competition'}
                class="p-2 text-sm rounded-lg border transition-colors {analysisType === 'competition' ? 'bg-spark-100 border-spark-300 text-spark-700' : 'bg-white border-gray-200 hover:border-gray-300'}"
              >
                🏆 Competition
              </button>
              <button
                onclick={() => analysisType = 'ideas'}
                class="p-2 text-sm rounded-lg border transition-colors {analysisType === 'ideas' ? 'bg-spark-100 border-spark-300 text-spark-700' : 'bg-white border-gray-200 hover:border-gray-300'}"
              >
                💡 Book Ideas
              </button>
            </div>
          </div>

          <button
            onclick={runAnalysis}
            disabled={isAnalyzing || !researchQuery.trim()}
            class="btn btn-primary w-full"
          >
            {#if isAnalyzing}
              <span class="animate-spin">⏳</span> Analyzing...
            {:else}
              🔍 Analyze Niche
            {/if}
          </button>
        </div>
      </div>

      <!-- Analysis Results -->
      <div class="col-span-2 space-y-6">
        {#if isAnalyzing}
          <div class="card">
            <div class="flex items-center justify-center py-12">
              <div class="text-center">
                <div class="text-4xl animate-bounce mb-4">🔍</div>
                <p class="text-gray-600">Analyzing "{researchQuery}"...</p>
                <p class="text-sm text-gray-400 mt-2">This may take a moment</p>
              </div>
            </div>
          </div>
        {:else if analysisResult}
          <!-- Summary Card -->
          <div class="card">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">Analysis: {analysisResult.query}</h2>
                <p class="text-sm text-gray-500 capitalize">{analysisResult.analysisType} analysis</p>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold {getScoreColor(analysisResult.opportunityScore)} px-4 py-2 rounded-lg">
                  {analysisResult.opportunityScore}
                </div>
                <div class="text-xs text-gray-500 mt-1">Opportunity Score</div>
              </div>
            </div>

            <p class="text-gray-700 mb-4">{analysisResult.summary}</p>

            <div class="flex gap-2">
              <button onclick={saveFromAnalysis} class="btn btn-primary">
                💾 Save This Niche
              </button>
              <button onclick={() => analysisResult = null} class="btn btn-secondary">
                🔄 New Search
              </button>
            </div>
          </div>

          <!-- Trends -->
          {#if analysisResult.trends?.length}
            <div class="card">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">📈 Market Trends</h3>
              <div class="space-y-3">
                {#each analysisResult.trends as trend}
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span>{getTrendIcon(trend.trendLevel)}</span>
                        <span class="font-medium text-gray-900">{trend.topic}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs px-2 py-1 rounded-full {getTrendColor(trend.trendLevel)} capitalize">
                          {trend.trendLevel}
                        </span>
                        <div class="flex items-center gap-1">
                          {#each Array(10) as _, i}
                            <div class="w-2 h-4 rounded-sm {i < trend.popularity ? 'bg-spark-500' : 'bg-gray-200'}"></div>
                          {/each}
                        </div>
                      </div>
                    </div>
                    <p class="text-sm text-gray-600">{trend.notes}</p>
                    {#if trend.seasonality}
                      <p class="text-xs text-gray-400 mt-1">📅 {trend.seasonality}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Competition -->
          {#if analysisResult.competition}
            <div class="card">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">🏆 Competition Analysis</h3>

              <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="text-center p-3 bg-gray-50 rounded-lg">
                  <div class="text-2xl font-bold {getCompetitionColor(analysisResult.competition.level)} px-3 py-1 rounded-full inline-block capitalize">
                    {analysisResult.competition.level}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">Competition Level</div>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded-lg">
                  <div class="text-2xl font-bold text-gray-900">{analysisResult.competition.estimatedBooks}</div>
                  <div class="text-xs text-gray-500 mt-1">Est. Competing Books</div>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded-lg">
                  <div class="text-2xl font-bold text-gray-900">{analysisResult.competition.difficulty}/10</div>
                  <div class="text-xs text-gray-500 mt-1">Entry Difficulty</div>
                </div>
              </div>

              {#if analysisResult.competition.marketGaps.length}
                <div class="mb-4">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">🎯 Market Gaps (Opportunities)</h4>
                  <div class="flex flex-wrap gap-2">
                    {#each analysisResult.competition.marketGaps as gap}
                      <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{gap}</span>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if analysisResult.competition.recommendations.length}
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-2">💡 Strategy Recommendations</h4>
                  <ul class="space-y-1">
                    {#each analysisResult.competition.recommendations as rec}
                      <li class="text-sm text-gray-600 flex items-start gap-2">
                        <span class="text-spark-500">•</span>
                        {rec}
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Book Ideas -->
          {#if analysisResult.bookIdeas?.length}
            <div class="card">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">💡 Book Ideas</h3>
              <div class="space-y-4">
                {#each analysisResult.bookIdeas as idea, i}
                  <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div class="flex items-start justify-between mb-2">
                      <div>
                        <h4 class="font-semibold text-gray-900">{i + 1}. {idea.title}</h4>
                        <p class="text-xs text-gray-500">Target: {idea.targetAge}</p>
                      </div>
                      <span class="px-2 py-1 text-xs rounded-full {getDemandColor(idea.estimatedDemand)}">
                        {idea.estimatedDemand} demand
                      </span>
                    </div>
                    <p class="text-sm text-gray-700 mb-2">{idea.concept}</p>
                    <p class="text-sm text-spark-600 mb-2">✨ {idea.uniqueAngle}</p>
                    <div class="flex flex-wrap gap-1">
                      {#each idea.keywords as kw}
                        <span class="text-xs px-2 py-0.5 bg-white border rounded-full text-gray-500">{kw}</span>
                      {/each}
                    </div>
                    <div class="mt-3 pt-3 border-t">
                      <a href="/books/new?concept={encodeURIComponent(idea.concept)}&title={encodeURIComponent(idea.title)}" class="btn btn-secondary text-sm">
                        📚 Create This Book
                      </a>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- General Recommendations -->
          {#if analysisResult.recommendations?.length}
            <div class="card">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">📋 Key Recommendations</h3>
              <ul class="space-y-2">
                {#each analysisResult.recommendations as rec, i}
                  <li class="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <span class="w-6 h-6 bg-spark-100 text-spark-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <span class="text-gray-700">{rec}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {:else}
          <!-- Empty State -->
          <div class="card">
            <div class="text-center py-12">
              <div class="text-6xl mb-4">🔍</div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Start Your Research</h3>
              <p class="text-gray-600 mb-4">Enter a topic to analyze market trends, competition, and generate book ideas</p>
              <div class="flex flex-wrap justify-center gap-2">
                <button onclick={() => { researchQuery = 'bedtime stories'; runAnalysis(); }} class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors">
                  bedtime stories
                </button>
                <button onclick={() => { researchQuery = 'learning numbers'; runAnalysis(); }} class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors">
                  learning numbers
                </button>
                <button onclick={() => { researchQuery = 'dinosaurs'; runAnalysis(); }} class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors">
                  dinosaurs
                </button>
                <button onclick={() => { researchQuery = 'emotions feelings'; runAnalysis(); }} class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors">
                  emotions & feelings
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
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
          <div class="text-4xl mb-2">📁</div>
          <p>No niches saved yet.</p>
          <button onclick={() => activeTab = 'research'} class="btn btn-primary mt-4">
            🔍 Start Researching
          </button>
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
                  {#each (typeof niche.keywords === 'string' ? JSON.parse(niche.keywords) : niche.keywords).slice(0, 5) as keyword}
                    <span class="text-xs px-2 py-0.5 bg-white border rounded-full text-gray-600">{keyword}</span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
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
            placeholder="Key insights, competitor analysis, market gaps..."
            rows="4"
            class="input resize-none"
          ></textarea>
        </div>

        <div>
          <label for="bookIdeas" class="label">Book Ideas (one per paragraph)</label>
          <textarea
            id="bookIdeas"
            bind:value={formData.bookIdeas}
            placeholder="Title: Description of book concept..."
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

        {#if selectedNiche.keywords}
          {@const keywords = typeof selectedNiche.keywords === 'string' ? JSON.parse(selectedNiche.keywords) : selectedNiche.keywords}
          {#if keywords?.length}
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Keywords</h4>
              <div class="flex gap-2 flex-wrap">
                {#each keywords as keyword}
                  <span class="text-sm px-3 py-1 bg-spark-100 text-spark-700 rounded-full">{keyword}</span>
                {/each}
              </div>
            </div>
          {/if}
        {/if}

        {#if selectedNiche.notes}
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">Research Notes</h4>
            <p class="text-gray-600 text-sm whitespace-pre-wrap">{selectedNiche.notes}</p>
          </div>
        {/if}

        {#if selectedNiche.bookIdeas}
          {@const ideas = typeof selectedNiche.bookIdeas === 'string' ? JSON.parse(selectedNiche.bookIdeas) : selectedNiche.bookIdeas}
          {#if ideas?.length}
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Book Ideas</h4>
              <div class="space-y-2">
                {#each ideas as idea}
                  <div class="p-2 bg-gray-50 rounded-lg text-sm text-gray-700">{idea}</div>
                {/each}
              </div>
            </div>
          {/if}
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
          📚 Create Book
        </a>
      </div>
    </div>
  </div>
{/if}
