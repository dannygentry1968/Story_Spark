<script lang="ts">
  import { onMount } from 'svelte';
  import { PROFIT_PIPELINE, BOOK_TYPES, BOOK_STATUS } from '$lib/types';
  import { getStats, type DashboardStats } from '$lib/api/client';
  import { stats, showError } from '$lib/stores';

  let loading = true;
  let showAnalytics = true;

  onMount(async () => {
    try {
      const data = await getStats();
      stats.set(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      showError('Failed to load dashboard data');
    } finally {
      loading = false;
    }
  });

  $: counts = $stats?.counts ?? {
    totalBooks: 0,
    inProgress: 0,
    published: 0,
    exported: 0,
    thisMonth: 0,
    series: 0,
    characters: 0,
    niches: 0
  };

  $: recentBooks = $stats?.recentBooks ?? [];
  $: analytics = $stats?.analytics;
  $: recentActivity = $stats?.recentActivity ?? [];

  // Pipeline data derived from analytics
  $: pipelineData = analytics?.booksByStatus ?? {
    draft: 0,
    writing: 0,
    illustrating: 0,
    review: 0,
    exported: 0,
    published: 0
  };

  // Calculate max for bar chart scaling
  $: maxPipelineCount = Math.max(
    1,
    pipelineData.draft,
    pipelineData.writing,
    pipelineData.illustrating,
    pipelineData.review,
    pipelineData.exported,
    pipelineData.published
  );

  // Activity icon mapping
  function getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      book_created: '📖',
      book_published: '🎉',
      book_exported: '📤',
      character_created: '👤',
      character_image: '🖼️',
      series_created: '📚',
      niche_created: '🔍'
    };
    return icons[type] || '📝';
  }

  // Format relative time
  function formatRelativeTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // Status colors for pipeline
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-400',
    writing: 'bg-blue-500',
    illustrating: 'bg-purple-500',
    review: 'bg-yellow-500',
    exported: 'bg-green-500',
    published: 'bg-spark-500'
  };
</script>

<svelte:head>
  <title>Dashboard | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome to StorySpark</h1>
      <p class="text-gray-600">Your AI-powered children's book creation studio</p>
    </div>
    <button
      onclick={() => showAnalytics = !showAnalytics}
      class="btn btn-secondary text-sm"
    >
      {showAnalytics ? '📊 Hide Analytics' : '📊 Show Analytics'}
    </button>
  </div>

  <!-- Quick Stats -->
  {#if loading}
    <div class="grid grid-cols-4 gap-4 mb-8">
      {#each Array(4) as _}
        <div class="card animate-pulse">
          <div class="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div class="h-4 bg-gray-100 rounded w-24"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="card">
        <div class="text-3xl font-bold text-gray-900">{counts.totalBooks}</div>
        <div class="text-sm text-gray-500">Total Books</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-blue-600">{counts.inProgress}</div>
        <div class="text-sm text-gray-500">In Progress</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-green-600">{counts.published}</div>
        <div class="text-sm text-gray-500">Published</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-spark-600">{counts.thisMonth}</div>
        <div class="text-sm text-gray-500">This Month</div>
      </div>
    </div>
  {/if}

  <!-- Analytics Section -->
  {#if showAnalytics && !loading && analytics}
    <div class="grid grid-cols-3 gap-6 mb-8">
      <!-- Book Pipeline Visualization -->
      <div class="card col-span-2">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">📊 Book Pipeline</h2>
        <div class="space-y-3">
          {#each Object.entries(pipelineData) as [status, count]}
            <div class="flex items-center gap-3">
              <div class="w-24 text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
              <div class="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="{statusColors[status]} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style="width: {Math.max(5, (count / maxPipelineCount) * 100)}%"
                >
                  {#if count > 0}
                    <span class="text-white text-xs font-medium">{count}</span>
                  {/if}
                </div>
              </div>
              <div class="w-8 text-sm font-medium text-gray-700">{count}</div>
            </div>
          {/each}
        </div>

        <!-- Pipeline Summary -->
        <div class="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-spark-600">{analytics.completionRate}%</div>
            <div class="text-xs text-gray-500">Completion Rate</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">{analytics.avgDaysToComplete || '-'}</div>
            <div class="text-xs text-gray-500">Avg Days to Complete</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">{counts.exported + counts.published}</div>
            <div class="text-xs text-gray-500">Ready for KDP</div>
          </div>
        </div>
      </div>

      <!-- Books by Type -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">📚 Books by Type</h2>
        <div class="space-y-2">
          {#each Object.entries(analytics.booksByType) as [type, count]}
            {@const bookType = BOOK_TYPES[type as keyof typeof BOOK_TYPES]}
            {#if bookType}
              <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-2">
                  <span>{bookType.icon}</span>
                  <span class="text-sm text-gray-700">{bookType.name}</span>
                </div>
                <span class="text-sm font-medium text-gray-900">{count}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>

    <!-- Monthly Trends Chart -->
    <div class="card mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">📈 Monthly Trends</h2>
      <div class="flex items-end justify-between h-40 px-4">
        {#each analytics.monthlyTrends as trend}
          {@const maxTrend = Math.max(...analytics.monthlyTrends.map(t => Math.max(t.created, t.completed)), 1)}
          <div class="flex flex-col items-center gap-1 flex-1">
            <div class="flex items-end gap-1 h-28">
              <!-- Created bar -->
              <div
                class="w-6 bg-blue-400 rounded-t transition-all duration-500"
                style="height: {Math.max(4, (trend.created / maxTrend) * 100)}%"
                title="Created: {trend.created}"
              ></div>
              <!-- Completed bar -->
              <div
                class="w-6 bg-green-500 rounded-t transition-all duration-500"
                style="height: {Math.max(4, (trend.completed / maxTrend) * 100)}%"
                title="Completed: {trend.completed}"
              ></div>
            </div>
            <div class="text-xs text-gray-500">{trend.month}</div>
          </div>
        {/each}
      </div>
      <div class="flex items-center justify-center gap-6 mt-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-blue-400 rounded"></div>
          <span class="text-gray-600">Books Created</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-green-500 rounded"></div>
          <span class="text-gray-600">Books Completed</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Create New Book -->
  <div class="card mb-8">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Start a New Book</h2>
    <div class="grid grid-cols-5 gap-4">
      {#each Object.values(BOOK_TYPES) as bookType}
        <a
          href="/books/new?type={bookType.id}"
          class="p-4 border border-gray-200 rounded-xl hover:border-spark-300 hover:bg-spark-50 transition-all group text-center"
        >
          <div class="text-3xl mb-2">{bookType.icon}</div>
          <div class="font-medium text-gray-900 group-hover:text-spark-700">{bookType.name}</div>
          <div class="text-xs text-gray-500 mt-1">{bookType.pageCount} pages</div>
        </a>
      {/each}
    </div>
  </div>

  <!-- Profit Pipeline -->
  <div class="card mb-8">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">The Profit Pipeline</h2>
    <div class="flex items-center justify-between">
      {#each PROFIT_PIPELINE as step, i}
        <div class="flex items-center">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl mb-2">
              {step.icon}
            </div>
            <div class="text-sm font-medium text-gray-900">{step.name}</div>
            <div class="text-xs text-gray-500 max-w-[100px]">{step.description}</div>
          </div>
          {#if i < PROFIT_PIPELINE.length - 1}
            <div class="w-8 h-0.5 bg-gray-200 mx-2"></div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Three Column Layout -->
  <div class="grid grid-cols-3 gap-6">
    <!-- Recent Books -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Recent Books</h2>
        <a href="/books" class="text-sm text-spark-600 hover:text-spark-700">View all →</a>
      </div>

      {#if loading}
        <div class="space-y-3">
          {#each Array(3) as _}
            <div class="p-3 bg-gray-50 rounded-lg animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          {/each}
        </div>
      {:else if recentBooks.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📚</div>
          <p>No books yet. Start your first one!</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each recentBooks as book}
            <a href="/books/{book.id}" class="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div class="flex items-center justify-between">
                <div class="font-medium text-gray-900 truncate">{book.title}</div>
                <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {BOOK_STATUS[book.status as keyof typeof BOOK_STATUS]?.label || book.status}
                </span>
              </div>
              <div class="text-sm text-gray-500 mt-1">
                {BOOK_TYPES[book.bookType as keyof typeof BOOK_TYPES]?.name || book.bookType}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Activity Feed -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

      {#if loading}
        <div class="space-y-3">
          {#each Array(5) as _}
            <div class="flex items-start gap-3 animate-pulse">
              <div class="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div class="flex-1">
                <div class="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div class="h-2 bg-gray-100 rounded w-1/4"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if recentActivity.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📝</div>
          <p>No recent activity</p>
        </div>
      {:else}
        <div class="space-y-3 max-h-[300px] overflow-y-auto">
          {#each recentActivity as activity}
            <div class="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-700 truncate">{activity.description}</p>
                <p class="text-xs text-gray-400">{formatRelativeTime(activity.timestamp)}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Quick Actions & Stats -->
    <div class="space-y-6">
      <!-- Quick Actions -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div class="space-y-2">
          <a href="/niche" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-xl">🔍</span>
            <div>
              <div class="font-medium text-gray-900">Research a Niche</div>
              <div class="text-sm text-gray-500">Find profitable book ideas</div>
            </div>
          </a>
          <a href="/characters" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-xl">👤</span>
            <div>
              <div class="font-medium text-gray-900">Create a Character</div>
              <div class="text-sm text-gray-500">Build your character bible</div>
            </div>
          </a>
          <a href="/series" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-xl">📖</span>
            <div>
              <div class="font-medium text-gray-900">Start a Series</div>
              <div class="text-sm text-gray-500">Group related books together</div>
            </div>
          </a>
        </div>
      </div>

      <!-- Your Library Stats -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Your Library</h2>
        <div class="grid grid-cols-3 gap-4 text-center">
          <a href="/series" class="hover:bg-gray-50 rounded-lg p-2 transition-colors">
            <div class="text-2xl font-bold text-gray-900">{counts.series}</div>
            <div class="text-sm text-gray-500">Series</div>
          </a>
          <a href="/characters" class="hover:bg-gray-50 rounded-lg p-2 transition-colors">
            <div class="text-2xl font-bold text-gray-900">{counts.characters}</div>
            <div class="text-sm text-gray-500">Characters</div>
          </a>
          <a href="/niche" class="hover:bg-gray-50 rounded-lg p-2 transition-colors">
            <div class="text-2xl font-bold text-gray-900">{counts.niches}</div>
            <div class="text-sm text-gray-500">Niches</div>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
