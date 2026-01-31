<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/books', label: 'Books', icon: '📚' },
    { href: '/series', label: 'Series', icon: '📖' },
    { href: '/characters', label: 'Characters', icon: '👤' },
    { href: '/niche', label: 'Niche Research', icon: '🔍' },
    { href: '/listing', label: 'Listings', icon: '🏷️' },
    { href: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  let { children } = $props();
</script>

<div class="min-h-screen flex">
  <!-- Sidebar -->
  <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
    <!-- Logo -->
    <div class="p-6 border-b border-gray-100">
      <a href="/" class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-spark-400 to-spark-600 rounded-xl flex items-center justify-center text-white text-xl">
          ✨
        </div>
        <div>
          <h1 class="font-bold text-gray-900 text-lg leading-tight">StorySpark</h1>
          <p class="text-xs text-gray-500">From Idea to Income</p>
        </div>
      </a>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-1">
      {#each navItems as item}
        <a
          href={item.href}
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
            {$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/')
              ? 'bg-spark-50 text-spark-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
        >
          <span class="text-lg">{item.icon}</span>
          {item.label}
        </a>
      {/each}
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-100">
      <div class="text-xs text-gray-400">
        StorySpark v3.0
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-auto bg-gray-50">
    {@render children()}
  </main>
</div>

<!-- Toast Notifications -->
<Toast />
