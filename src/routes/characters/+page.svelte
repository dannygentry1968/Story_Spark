<script lang="ts">
  import { onMount } from 'svelte';
  import { getCharacters, createCharacter, updateCharacter, deleteCharacter, generateCharacterImage, getIllustrationStyles } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';

  let characters: any[] = [];
  let loading = true;
  let showCreateModal = false;
  let showDetailModal = false;
  let selectedCharacter: any = null;
  let generatingImage = false;
  let illustrationStyles: any[] = [];

  let formData = {
    name: '',
    role: '',
    description: '',
    visualDescription: '',
    personality: '',
    seriesId: ''
  };

  onMount(async () => {
    await loadCharacters();
    try {
      const styles = await getIllustrationStyles();
      illustrationStyles = styles;
    } catch (err) {
      console.error('Failed to load styles:', err);
    }
  });

  async function loadCharacters() {
    try {
      loading = true;
      characters = await getCharacters();
    } catch (err) {
      console.error('Failed to load characters:', err);
      showError('Failed to load characters');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    formData = {
      name: '',
      role: '',
      description: '',
      visualDescription: '',
      personality: '',
      seriesId: ''
    };
    showCreateModal = true;
  }

  function openDetailModal(character: any) {
    selectedCharacter = character;
    showDetailModal = true;
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      showError('Please enter a character name');
      return;
    }
    if (!formData.description.trim()) {
      showError('Please provide a character description');
      return;
    }
    if (!formData.visualDescription.trim()) {
      showError('Please provide a visual description');
      return;
    }

    try {
      const newCharacter = await createCharacter({
        name: formData.name.trim(),
        role: formData.role.trim() || null,
        description: formData.description.trim(),
        visualDescription: formData.visualDescription.trim(),
        personality: formData.personality.trim() || null,
        seriesId: formData.seriesId || null
      });

      characters = [newCharacter, ...characters];
      showCreateModal = false;
      showSuccess('Character created!');
    } catch (err) {
      console.error('Failed to create character:', err);
      showError('Failed to create character');
    }
  }

  async function handleGenerateImage(character: any, style: string = 'watercolor') {
    try {
      generatingImage = true;
      showInfo('Generating character reference image...');

      const result = await generateCharacterImage({
        characterId: character.id,
        name: character.name,
        visualDescription: character.visualDescription,
        style
      });

      // Update character in list
      const index = characters.findIndex(c => c.id === character.id);
      if (index !== -1) {
        characters[index] = { ...characters[index], referenceImagePath: result.localPath };
        characters = [...characters];
      }

      if (selectedCharacter?.id === character.id) {
        selectedCharacter = { ...selectedCharacter, referenceImagePath: result.localPath };
      }

      showSuccess('Reference image generated!');
    } catch (err) {
      console.error('Failed to generate image:', err);
      showError('Failed to generate reference image');
    } finally {
      generatingImage = false;
    }
  }

  async function handleDelete(character: any) {
    if (!confirm(`Delete "${character.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteCharacter(character.id);
      characters = characters.filter(c => c.id !== character.id);
      showDetailModal = false;
      selectedCharacter = null;
      showSuccess('Character deleted');
    } catch (err) {
      console.error('Failed to delete character:', err);
      showError('Failed to delete character');
    }
  }
</script>

<svelte:head>
  <title>Characters | StorySpark</title>
</svelte:head>

<div class="p-8 max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Character Bible</h1>
      <p class="text-gray-600">Create and manage reusable characters for visual consistency</p>
    </div>
    <button onclick={openCreateModal} class="btn btn-primary">
      <span>+</span> New Character
    </button>
  </div>

  {#if loading}
    <div class="grid grid-cols-4 gap-6">
      {#each Array(4) as _}
        <div class="card animate-pulse">
          <div class="aspect-square bg-gray-200 rounded-lg mb-4"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
      {/each}
    </div>
  {:else if characters.length === 0}
    <div class="card text-center py-16">
      <div class="text-6xl mb-4">👤</div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No characters yet</h2>
      <p class="text-gray-600 mb-6">Create characters with reference images for consistent illustrations across your books</p>
      <button onclick={openCreateModal} class="btn btn-primary">Create Your First Character</button>
    </div>
  {:else}
    <div class="grid grid-cols-4 gap-6">
      {#each characters as character (character.id)}
        <a
          href="/characters/{character.id}"
          class="card hover:shadow-md transition-shadow cursor-pointer block"
        >
          <div class="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
            {#if character.referenceImagePath}
              <img src={character.referenceImagePath} alt={character.name} class="w-full h-full object-cover" />
            {:else}
              <span class="text-4xl">👤</span>
            {/if}
          </div>
          <h3 class="font-semibold text-gray-900">{character.name}</h3>
          {#if character.role}
            <p class="text-sm text-gray-500">{character.role}</p>
          {/if}
          {#if character.seriesName}
            <p class="text-xs text-spark-600 mt-1">{character.seriesName}</p>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Character Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold text-gray-900 mb-4">Create Character</h3>

      <div class="space-y-4">
        <div>
          <label for="name" class="label">Name <span class="text-red-500">*</span></label>
          <input
            id="name"
            type="text"
            bind:value={formData.name}
            placeholder="e.g., Finley the Fox"
            class="input"
          />
        </div>

        <div>
          <label for="role" class="label">Role</label>
          <input
            id="role"
            type="text"
            bind:value={formData.role}
            placeholder="e.g., Main Character, Sidekick, Villain"
            class="input"
          />
        </div>

        <div>
          <label for="description" class="label">Description <span class="text-red-500">*</span></label>
          <textarea
            id="description"
            bind:value={formData.description}
            placeholder="Character's background, story, personality, and key traits for AI story generation..."
            rows="3"
            class="input resize-none"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">This description helps AI generate better stories with this character.</p>
        </div>

        <div>
          <label for="visual" class="label">Visual Description <span class="text-red-500">*</span></label>
          <textarea
            id="visual"
            bind:value={formData.visualDescription}
            placeholder="Describe physical appearance: colors, features, clothing, distinctive traits..."
            rows="4"
            class="input resize-none"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">Be specific! This description will be used to generate consistent images.</p>
        </div>

        <div>
          <label for="personality" class="label">Personality</label>
          <textarea
            id="personality"
            bind:value={formData.personality}
            placeholder="Key personality traits, behaviors, quirks..."
            rows="2"
            class="input resize-none"
          ></textarea>
        </div>

      </div>

      <div class="flex gap-3 mt-6">
        <button onclick={() => showCreateModal = false} class="btn btn-secondary flex-1">
          Cancel
        </button>
        <button onclick={handleCreate} class="btn btn-primary flex-1">
          Create Character
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Character Detail Modal -->
{#if showDetailModal && selectedCharacter}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-start gap-6">
        <!-- Reference Image -->
        <div class="w-48 flex-shrink-0">
          <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
            {#if selectedCharacter.referenceImagePath}
              <img
                src={selectedCharacter.referenceImagePath}
                alt={selectedCharacter.name}
                class="w-full h-full object-cover"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-gray-400">
                <span class="text-5xl">👤</span>
              </div>
            {/if}
          </div>

          <div class="space-y-2">
            <select
              id="style-select"
              class="input text-sm py-1"
              disabled={generatingImage}
            >
              {#each illustrationStyles as style}
                <option value={style.id}>{style.name}</option>
              {/each}
            </select>
            <button
              onclick={() => {
                const select = document.getElementById('style-select') as HTMLSelectElement;
                handleGenerateImage(selectedCharacter, select?.value || 'watercolor');
              }}
              disabled={generatingImage}
              class="btn btn-secondary w-full text-sm"
            >
              {#if generatingImage}
                <span class="animate-spin">⏳</span> Generating...
              {:else}
                🖼️ {selectedCharacter.referenceImagePath ? 'Regenerate' : 'Generate'} Image
              {/if}
            </button>
          </div>
        </div>

        <!-- Character Info -->
        <div class="flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-2xl font-bold text-gray-900">{selectedCharacter.name}</h3>
              {#if selectedCharacter.role}
                <p class="text-gray-500">{selectedCharacter.role}</p>
              {/if}
            </div>
            <button onclick={() => showDetailModal = false} class="text-gray-400 hover:text-gray-600 text-xl">
              ✕
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-1">Visual Description</h4>
              <p class="text-gray-600 text-sm">{selectedCharacter.visualDescription}</p>
            </div>

            {#if selectedCharacter.personality}
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">Personality</h4>
                <p class="text-gray-600 text-sm">{selectedCharacter.personality}</p>
              </div>
            {/if}

            {#if selectedCharacter.backstory}
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">Backstory</h4>
                <p class="text-gray-600 text-sm">{selectedCharacter.backstory}</p>
              </div>
            {/if}

            {#if selectedCharacter.seriesName}
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">Series</h4>
                <p class="text-spark-600 text-sm">{selectedCharacter.seriesName}</p>
              </div>
            {/if}
          </div>

          <div class="flex gap-3 mt-6 pt-4 border-t">
            <button onclick={() => handleDelete(selectedCharacter)} class="btn btn-secondary text-red-600 hover:bg-red-50">
              🗑️ Delete
            </button>
            <div class="flex-1"></div>
            <button onclick={() => showDetailModal = false} class="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
