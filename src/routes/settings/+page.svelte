<script lang="ts">
  import { onMount } from 'svelte';
  import { getSettings, updateSettings, testApiConnection } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';
  import { BOOK_TYPES, AGE_RANGES } from '$lib/types';
  import { TRIM_SIZES } from '$lib/services/pdf-export';

  interface SettingItem {
    key: string;
    value: string;
    category: string;
    isDefault?: boolean;
  }

  let loading = true;
  let saving = false;
  let testingApi: 'anthropic' | 'openai' | null = null;
  let activeTab: 'api' | 'defaults' | 'export' | 'ui' = 'api';

  // Settings state
  let settings: Record<string, string> = {};
  let originalSettings: Record<string, string> = {};
  let hasChanges = false;

  // API visibility toggles
  let showAnthropicKey = false;
  let showOpenaiKey = false;

  const ILLUSTRATION_STYLES = [
    { id: 'watercolor', name: 'Watercolor' },
    { id: 'digital', name: 'Digital Art' },
    { id: 'cartoon', name: 'Cartoon' },
    { id: 'pencil', name: 'Pencil Sketch' },
    { id: 'oil', name: 'Oil Painting' },
    { id: 'flat', name: 'Flat Vector' },
    { id: 'storybook', name: 'Classic Storybook' },
    { id: 'whimsical', name: 'Whimsical' }
  ];

  onMount(async () => {
    await loadSettings();
  });

  async function loadSettings() {
    try {
      loading = true;
      const allSettings = await getSettings();

      // Convert to key-value map
      settings = {};
      for (const setting of allSettings) {
        settings[setting.key] = setting.value;
      }

      originalSettings = { ...settings };
      hasChanges = false;
    } catch (err) {
      console.error('Failed to load settings:', err);
      showError('Failed to load settings');
    } finally {
      loading = false;
    }
  }

  function updateSetting(key: string, value: string) {
    settings[key] = value;
    settings = { ...settings }; // Trigger reactivity
    hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }

  async function handleSave() {
    try {
      saving = true;

      // Only save changed settings
      const changedSettings: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (originalSettings[key] !== value) {
          changedSettings[key] = value;
        }
      }

      if (Object.keys(changedSettings).length === 0) {
        showInfo('No changes to save');
        return;
      }

      await updateSettings(changedSettings);
      originalSettings = { ...settings };
      hasChanges = false;
      showSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showError('Failed to save settings');
    } finally {
      saving = false;
    }
  }

  function handleReset() {
    settings = { ...originalSettings };
    hasChanges = false;
  }

  async function handleTestApi(type: 'anthropic' | 'openai') {
    const keyField = type === 'anthropic' ? 'api.anthropicKey' : 'api.openaiKey';
    const apiKey = settings[keyField];

    if (!apiKey) {
      showError(`Please enter your ${type === 'anthropic' ? 'Claude' : 'OpenAI'} API key first`);
      return;
    }

    try {
      testingApi = type;
      showInfo(`Testing ${type === 'anthropic' ? 'Claude' : 'OpenAI'} API connection...`);

      const result = await testApiConnection(type, apiKey);

      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    } catch (err) {
      showError(`Failed to test ${type} API`);
    } finally {
      testingApi = null;
    }
  }

  function maskApiKey(key: string): string {
    if (!key || key.length < 8) return key;
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  }
</script>

<svelte:head>
  <title>Settings | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-4xl mx-auto">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
    <p class="text-gray-500 mt-1">Configure API keys, defaults, and preferences</p>
  </div>

  {#if loading}
    <div class="animate-pulse space-y-4">
      <div class="h-12 bg-gray-200 rounded"></div>
      <div class="h-64 bg-gray-100 rounded"></div>
    </div>
  {:else}
    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-6">
        {#each [
          { id: 'api', label: '🔑 API Keys', desc: 'AI service credentials' },
          { id: 'defaults', label: '📚 Defaults', desc: 'Book & illustration defaults' },
          { id: 'export', label: '📤 Export', desc: 'PDF export settings' },
          { id: 'ui', label: '🎨 Interface', desc: 'UI preferences' }
        ] as tab}
          <button
            onclick={() => activeTab = tab.id as typeof activeTab}
            class="py-3 text-sm font-medium border-b-2 transition-colors
              {activeTab === tab.id
                ? 'border-spark-500 text-spark-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}"
          >
            {tab.label}
          </button>
        {/each}
      </nav>
    </div>

    <!-- API Keys Tab -->
    {#if activeTab === 'api'}
      <div class="space-y-6">
        <!-- Anthropic/Claude API -->
        <div class="card">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Claude API (Anthropic)</h3>
              <p class="text-sm text-gray-500">Used for text generation, outlines, and listings</p>
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener"
              class="text-sm text-spark-600 hover:text-spark-700"
            >
              Get API Key →
            </a>
          </div>

          <div class="space-y-3">
            <div class="relative">
              <label for="anthropicKey" class="label">API Key</label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  {#if showAnthropicKey}
                    <input
                      id="anthropicKey"
                      type="text"
                      value={settings['api.anthropicKey'] || ''}
                      oninput={(e) => updateSetting('api.anthropicKey', e.currentTarget.value)}
                      class="input font-mono text-sm pr-10"
                      placeholder="sk-ant-..."
                    />
                  {:else}
                    <input
                      id="anthropicKeyMasked"
                      type="password"
                      value={settings['api.anthropicKey'] || ''}
                      oninput={(e) => updateSetting('api.anthropicKey', e.currentTarget.value)}
                      class="input font-mono text-sm pr-10"
                      placeholder="sk-ant-..."
                    />
                  {/if}
                  <button
                    type="button"
                    onclick={() => showAnthropicKey = !showAnthropicKey}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showAnthropicKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  onclick={() => handleTestApi('anthropic')}
                  disabled={testingApi !== null || !settings['api.anthropicKey']}
                  class="btn btn-secondary"
                >
                  {#if testingApi === 'anthropic'}
                    ⏳ Testing...
                  {:else}
                    🔌 Test
                  {/if}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- OpenAI API -->
        <div class="card">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">OpenAI API</h3>
              <p class="text-sm text-gray-500">Used for image generation (DALL-E / gpt-image-1)</p>
            </div>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener"
              class="text-sm text-spark-600 hover:text-spark-700"
            >
              Get API Key →
            </a>
          </div>

          <div class="space-y-3">
            <div class="relative">
              <label for="openaiKey" class="label">API Key</label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  {#if showOpenaiKey}
                    <input
                      id="openaiKey"
                      type="text"
                      value={settings['api.openaiKey'] || ''}
                      oninput={(e) => updateSetting('api.openaiKey', e.currentTarget.value)}
                      class="input font-mono text-sm pr-10"
                      placeholder="sk-..."
                    />
                  {:else}
                    <input
                      id="openaiKeyMasked"
                      type="password"
                      value={settings['api.openaiKey'] || ''}
                      oninput={(e) => updateSetting('api.openaiKey', e.currentTarget.value)}
                      class="input font-mono text-sm pr-10"
                      placeholder="sk-..."
                    />
                  {/if}
                  <button
                    type="button"
                    onclick={() => showOpenaiKey = !showOpenaiKey}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showOpenaiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  onclick={() => handleTestApi('openai')}
                  disabled={testingApi !== null || !settings['api.openaiKey']}
                  class="btn btn-secondary"
                >
                  {#if testingApi === 'openai'}
                    ⏳ Testing...
                  {:else}
                    🔌 Test
                  {/if}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-amber-50 border-amber-200">
          <h4 class="text-sm font-medium text-amber-800 mb-2">🔒 Security Note</h4>
          <p class="text-sm text-amber-700">
            API keys are stored securely in your local database. They are never sent to external servers
            except when making requests to the respective AI services.
          </p>
        </div>
      </div>

    <!-- Defaults Tab -->
    {:else if activeTab === 'defaults'}
      <div class="space-y-6">
        <!-- Book Defaults -->
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">📖 New Book Defaults</h3>
          <p class="text-sm text-gray-500 mb-4">These settings will be pre-filled when creating new books</p>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="defaultBookType" class="label">Book Type</label>
              <select
                id="defaultBookType"
                value={settings['defaults.bookType'] || 'picture'}
                onchange={(e) => updateSetting('defaults.bookType', e.currentTarget.value)}
                class="input"
              >
                {#each Object.entries(BOOK_TYPES) as [key, type]}
                  <option value={key}>{type.icon} {type.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="defaultTargetAge" class="label">Target Age</label>
              <select
                id="defaultTargetAge"
                value={settings['defaults.targetAge'] || '3-5'}
                onchange={(e) => updateSetting('defaults.targetAge', e.currentTarget.value)}
                class="input"
              >
                {#each Object.entries(AGE_RANGES) as [key, age]}
                  <option value={key}>{age.label} ({age.description})</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="defaultTrimSize" class="label">Trim Size</label>
              <select
                id="defaultTrimSize"
                value={settings['defaults.trimSize'] || '8.5x8.5'}
                onchange={(e) => updateSetting('defaults.trimSize', e.currentTarget.value)}
                class="input"
              >
                {#each Object.entries(TRIM_SIZES) as [key, size]}
                  <option value={key}>{size.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="defaultPageCount" class="label">Page Count</label>
              <select
                id="defaultPageCount"
                value={settings['defaults.pageCount'] || '24'}
                onchange={(e) => updateSetting('defaults.pageCount', e.currentTarget.value)}
                class="input"
              >
                <option value="16">16 pages</option>
                <option value="24">24 pages</option>
                <option value="32">32 pages</option>
                <option value="40">40 pages</option>
                <option value="48">48 pages</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Illustration Defaults -->
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">🎨 Illustration Defaults</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="defaultStyle" class="label">Default Style</label>
              <select
                id="defaultStyle"
                value={settings['defaults.illustrationStyle'] || 'watercolor'}
                onchange={(e) => updateSetting('defaults.illustrationStyle', e.currentTarget.value)}
                class="input"
              >
                {#each ILLUSTRATION_STYLES as style}
                  <option value={style.id}>{style.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="defaultQuality" class="label">Default Quality</label>
              <select
                id="defaultQuality"
                value={settings['defaults.illustrationQuality'] || 'high'}
                onchange={(e) => updateSetting('defaults.illustrationQuality', e.currentTarget.value)}
                class="input"
              >
                <option value="standard">Standard (faster, lower cost)</option>
                <option value="high">High (better quality)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

    <!-- Export Tab -->
    {:else if activeTab === 'export'}
      <div class="space-y-6">
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">📤 PDF Export Defaults</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="exportPaperType" class="label">Paper Type</label>
              <select
                id="exportPaperType"
                value={settings['export.paperType'] || 'white'}
                onchange={(e) => updateSetting('export.paperType', e.currentTarget.value)}
                class="input"
              >
                <option value="white">White Paper</option>
                <option value="cream">Cream Paper</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Affects spine width calculations</p>
            </div>

            <div>
              <label for="exportColorMode" class="label">Color Mode</label>
              <select
                id="exportColorMode"
                value={settings['export.colorMode'] || 'color'}
                onchange={(e) => updateSetting('export.colorMode', e.currentTarget.value)}
                class="input"
              >
                <option value="color">Full Color</option>
                <option value="bw">Black & White</option>
              </select>
            </div>

            <div class="col-span-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings['export.includeBleed'] === 'true'}
                  onchange={(e) => updateSetting('export.includeBleed', e.currentTarget.checked ? 'true' : 'false')}
                  class="rounded border-gray-300 text-spark-600 focus:ring-spark-500"
                />
                <div>
                  <span class="font-medium text-gray-900">Include Bleed by Default</span>
                  <p class="text-sm text-gray-500">Add 0.125" bleed for full-page illustrations</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="card bg-blue-50 border-blue-200">
          <h4 class="text-sm font-medium text-blue-800 mb-2">💡 KDP Export Tips</h4>
          <ul class="text-sm text-blue-700 space-y-1">
            <li>• White paper is recommended for colorful children's books</li>
            <li>• Always include bleed when illustrations extend to page edges</li>
            <li>• Preview your PDF before uploading to KDP</li>
            <li>• KDP accepts RGB PDFs (they convert to CMYK if needed)</li>
          </ul>
        </div>
      </div>

    <!-- UI Tab -->
    {:else if activeTab === 'ui'}
      <div class="space-y-6">
        <div class="card">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">🎨 Interface Preferences</h3>

          <div class="space-y-4">
            <div>
              <label for="uiTheme" class="label">Theme</label>
              <select
                id="uiTheme"
                value={settings['ui.theme'] || 'light'}
                onchange={(e) => updateSetting('ui.theme', e.currentTarget.value)}
                class="input max-w-xs"
              >
                <option value="light">Light</option>
                <option value="dark">Dark (coming soon)</option>
                <option value="system">System</option>
              </select>
            </div>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings['ui.compactView'] === 'true'}
                onchange={(e) => updateSetting('ui.compactView', e.currentTarget.checked ? 'true' : 'false')}
                class="rounded border-gray-300 text-spark-600 focus:ring-spark-500"
              />
              <div>
                <span class="font-medium text-gray-900">Compact View</span>
                <p class="text-sm text-gray-500">Use smaller cards and tighter spacing</p>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings['ui.showTips'] !== 'false'}
                onchange={(e) => updateSetting('ui.showTips', e.currentTarget.checked ? 'true' : 'false')}
                class="rounded border-gray-300 text-spark-600 focus:ring-spark-500"
              />
              <div>
                <span class="font-medium text-gray-900">Show Tips & Hints</span>
                <p class="text-sm text-gray-500">Display helpful tips throughout the interface</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    {/if}

    <!-- Save Bar -->
    {#if hasChanges}
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <span class="text-sm text-gray-600">You have unsaved changes</span>
          <div class="flex gap-3">
            <button onclick={handleReset} class="btn btn-secondary">
              ↩️ Discard Changes
            </button>
            <button onclick={handleSave} disabled={saving} class="btn btn-primary">
              {#if saving}
                ⏳ Saving...
              {:else}
                💾 Save Settings
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Add bottom padding when save bar is visible */
  :global(body:has(.fixed.bottom-0)) {
    padding-bottom: 80px;
  }
</style>
