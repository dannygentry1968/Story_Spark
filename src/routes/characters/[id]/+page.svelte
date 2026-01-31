<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getCharacter, updateCharacter, deleteCharacter, getIllustrationStyles } from '$lib/api/client';
  import { showError, showSuccess, showInfo } from '$lib/stores';

  const characterId = $page.params.id;

  interface CharacterImage {
    id: string;
    path: string;
    type: 'reference' | 'pose' | 'expression' | 'action';
    label: string;
    createdAt: Date;
  }

  let character: any = null;
  let loading = true;
  let saving = false;
  let editing = false;
  let generatingImage = false;
  let currentGenerationType = '';
  let illustrationStyles: any[] = [];
  let selectedStyle = 'watercolor';
  let showDeleteModal = false;

  // Character images (main reference + additional poses)
  let characterImages: CharacterImage[] = [];

  // Pose/expression presets for character sheet
  const POSE_PRESETS = [
    { id: 'front', label: 'Front View', prompt: 'front-facing view, standing straight, clear full body shot' },
    { id: 'side', label: 'Side Profile', prompt: 'side profile view, clear silhouette' },
    { id: 'back', label: 'Back View', prompt: 'back view showing posterior details' },
    { id: 'action', label: 'Action Pose', prompt: 'dynamic action pose, showing movement' }
  ];

  const EXPRESSION_PRESETS = [
    { id: 'happy', label: 'Happy', prompt: 'happy and joyful expression, big smile' },
    { id: 'sad', label: 'Sad', prompt: 'sad expression, downcast eyes' },
    { id: 'surprised', label: 'Surprised', prompt: 'surprised expression, wide eyes' },
    { id: 'thinking', label: 'Thinking', prompt: 'thoughtful expression, pondering' },
    { id: 'excited', label: 'Excited', prompt: 'excited and enthusiastic expression' },
    { id: 'worried', label: 'Worried', prompt: 'worried or concerned expression' }
  ];

  let editForm = {
    name: '',
    role: '',
    visualDescription: '',
    personality: '',
    description: ''
  };

  onMount(async () => {
    await Promise.all([loadCharacter(), loadStyles()]);
  });

  async function loadCharacter() {
    try {
      loading = true;
      character = await getCharacter(characterId);
      editForm = {
        name: character.name || '',
        role: character.role || '',
        visualDescription: character.visualDescription || '',
        personality: character.personality || '',
        description: character.description || ''
      };

      // Build images array from character data
      characterImages = [];
      if (character.referenceImagePath) {
        characterImages.push({
          id: 'main',
          path: character.referenceImagePath,
          type: 'reference',
          label: 'Main Reference',
          createdAt: new Date(character.updatedAt)
        });
      }

      // Load any additional pose images (would come from a poses table in production)
      // For now, we'll just show the main reference
    } catch (err) {
      console.error('Failed to load character:', err);
      showError('Failed to load character');
      goto('/characters');
    } finally {
      loading = false;
    }
  }

  async function loadStyles() {
    try {
      const styles = await getIllustrationStyles();
      illustrationStyles = styles;
    } catch (err) {
      console.error('Failed to load styles:', err);
    }
  }

  async function handleSave() {
    if (!editForm.name.trim()) {
      showError('Name is required');
      return;
    }
    if (!editForm.visualDescription.trim()) {
      showError('Visual description is required');
      return;
    }

    try {
      saving = true;
      await updateCharacter(characterId, {
        name: editForm.name.trim(),
        role: editForm.role.trim() || null,
        visualDescription: editForm.visualDescription.trim(),
        personality: editForm.personality.trim() || null,
        description: editForm.description.trim() || null
      });

      character = {
        ...character,
        ...editForm
      };
      editing = false;
      showSuccess('Character updated!');
    } catch (err) {
      console.error('Failed to update character:', err);
      showError('Failed to update character');
    } finally {
      saving = false;
    }
  }

  async function handleGenerateImage(type: string, customPrompt?: string) {
    try {
      generatingImage = true;
      currentGenerationType = type;

      const stylePrompt = illustrationStyles.find(s => s.id === selectedStyle)?.description || selectedStyle;

      let prompt = '';
      if (type === 'reference') {
        prompt = `Character reference sheet for "${character.name}": ${character.visualDescription}. Front-facing view, full body, simple background. Style: ${stylePrompt}, children's book illustration.`;
      } else if (type.startsWith('pose_')) {
        const poseId = type.replace('pose_', '');
        const pose = POSE_PRESETS.find(p => p.id === poseId);
        prompt = `"${character.name}" - ${character.visualDescription}. ${pose?.prompt}. Style: ${stylePrompt}, children's book illustration.`;
      } else if (type.startsWith('expression_')) {
        const exprId = type.replace('expression_', '');
        const expr = EXPRESSION_PRESETS.find(e => e.id === exprId);
        prompt = `"${character.name}" portrait showing ${expr?.prompt}. ${character.visualDescription}. Style: ${stylePrompt}, children's book illustration.`;
      } else if (customPrompt) {
        prompt = `"${character.name}" - ${character.visualDescription}. ${customPrompt}. Style: ${stylePrompt}, children's book illustration.`;
      }

      showInfo(`Generating ${type.replace('_', ' ')} image...`);

      const response = await fetch('/api/generate/character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          name: character.name,
          visualDescription: prompt,
          style: selectedStyle
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate image');
      }

      const result = await response.json();

      if (type === 'reference') {
        character.referenceImagePath = result.data.localPath;
        characterImages = characterImages.filter(img => img.id !== 'main');
        characterImages = [{
          id: 'main',
          path: result.data.localPath,
          type: 'reference',
          label: 'Main Reference',
          createdAt: new Date()
        }, ...characterImages];
      } else {
        // Add as additional image
        characterImages = [...characterImages, {
          id: `${type}_${Date.now()}`,
          path: result.data.localPath,
          type: type.startsWith('pose_') ? 'pose' : type.startsWith('expression_') ? 'expression' : 'action',
          label: type.replace('pose_', '').replace('expression_', '').replace('_', ' '),
          createdAt: new Date()
        }];
      }

      showSuccess('Image generated!');
    } catch (err) {
      console.error('Failed to generate image:', err);
      showError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      generatingImage = false;
      currentGenerationType = '';
    }
  }

  async function handleDelete() {
    try {
      await deleteCharacter(characterId);
      showSuccess('Character deleted');
      goto('/characters');
    } catch (err) {
      showError('Failed to delete character');
    }
  }

  function removeImage(imageId: string) {
    characterImages = characterImages.filter(img => img.id !== imageId);
  }
</script>

<svelte:head>
  <title>{character?.name || 'Loading...'} | StorySpark</title>
</svelte:head>

{#if loading}
  <div class="p-8 max-w-6xl mx-auto">
    <div class="animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-4 bg-gray-100 rounded w-1/4 mb-8"></div>
      <div class="grid grid-cols-3 gap-6">
        <div class="h-64 bg-gray-200 rounded"></div>
        <div class="col-span-2 h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  </div>
{:else if character}
  <div class="p-8 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <a href="/characters" class="text-spark-600 hover:text-spark-700 text-sm mb-2 inline-block">← Back to Characters</a>

      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{character.name}</h1>
          {#if character.role}
            <p class="text-gray-500 mt-1">{character.role}</p>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          <button onclick={() => editing = !editing} class="btn btn-secondary">
            {editing ? '✕ Cancel' : '✏️ Edit'}
          </button>
          <button onclick={() => showDeleteModal = true} class="btn btn-secondary text-red-600 hover:bg-red-50">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <!-- Left: Main Reference Image & Generation -->
      <div class="space-y-4">
        <!-- Main Reference -->
        <div class="card">
          <h3 class="font-semibold text-gray-900 mb-3">Main Reference</h3>
          <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
            {#if character.referenceImagePath}
              <img
                src={character.referenceImagePath}
                alt={character.name}
                class="w-full h-full object-cover"
              />
            {:else}
              <div class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <span class="text-5xl mb-2">👤</span>
                <span class="text-sm">No reference image</span>
              </div>
            {/if}
          </div>

          <div class="space-y-2">
            <select bind:value={selectedStyle} class="input text-sm">
              {#each illustrationStyles as style}
                <option value={style.id}>{style.name}</option>
              {/each}
              {#if illustrationStyles.length === 0}
                <option value="watercolor">Watercolor</option>
                <option value="digital">Digital Art</option>
                <option value="cartoon">Cartoon</option>
                <option value="storybook">Classic Storybook</option>
              {/if}
            </select>

            <button
              onclick={() => handleGenerateImage('reference')}
              disabled={generatingImage}
              class="btn btn-primary w-full"
            >
              {#if generatingImage && currentGenerationType === 'reference'}
                <span class="animate-spin">⏳</span> Generating...
              {:else}
                🖼️ {character.referenceImagePath ? 'Regenerate' : 'Generate'} Reference
              {/if}
            </button>
          </div>
        </div>

        <!-- Quick Poses -->
        <div class="card">
          <h3 class="font-semibold text-gray-900 mb-3">Quick Poses</h3>
          <div class="grid grid-cols-2 gap-2">
            {#each POSE_PRESETS as pose}
              <button
                onclick={() => handleGenerateImage(`pose_${pose.id}`)}
                disabled={generatingImage || !character.referenceImagePath}
                class="btn btn-secondary text-xs py-2"
              >
                {#if generatingImage && currentGenerationType === `pose_${pose.id}`}
                  ⏳
                {:else}
                  {pose.label}
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Expressions -->
        <div class="card">
          <h3 class="font-semibold text-gray-900 mb-3">Expressions</h3>
          <div class="grid grid-cols-3 gap-2">
            {#each EXPRESSION_PRESETS as expr}
              <button
                onclick={() => handleGenerateImage(`expression_${expr.id}`)}
                disabled={generatingImage || !character.referenceImagePath}
                class="btn btn-secondary text-xs py-2"
              >
                {#if generatingImage && currentGenerationType === `expression_${expr.id}`}
                  ⏳
                {:else}
                  {expr.label}
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Right: Character Details & Gallery -->
      <div class="col-span-2 space-y-6">
        {#if editing}
          <!-- Edit Form -->
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Edit Character</h3>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="name" class="label">Name <span class="text-red-500">*</span></label>
                  <input
                    id="name"
                    type="text"
                    bind:value={editForm.name}
                    class="input"
                    placeholder="Character name"
                  />
                </div>
                <div>
                  <label for="role" class="label">Role</label>
                  <input
                    id="role"
                    type="text"
                    bind:value={editForm.role}
                    class="input"
                    placeholder="e.g., Protagonist, Sidekick"
                  />
                </div>
              </div>

              <div>
                <label for="visual" class="label">Visual Description <span class="text-red-500">*</span></label>
                <textarea
                  id="visual"
                  bind:value={editForm.visualDescription}
                  rows="4"
                  class="input"
                  placeholder="Describe physical appearance in detail..."
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">Be specific! This is used for AI image generation.</p>
              </div>

              <div>
                <label for="personality" class="label">Personality</label>
                <textarea
                  id="personality"
                  bind:value={editForm.personality}
                  rows="2"
                  class="input"
                  placeholder="Key personality traits..."
                ></textarea>
              </div>

              <div>
                <label for="description" class="label">Backstory / Notes</label>
                <textarea
                  id="description"
                  bind:value={editForm.description}
                  rows="2"
                  class="input"
                  placeholder="Additional notes about the character..."
                ></textarea>
              </div>

              <div class="flex gap-3 pt-2">
                <button onclick={() => editing = false} class="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button onclick={handleSave} disabled={saving} class="btn btn-primary flex-1">
                  {#if saving}
                    ⏳ Saving...
                  {:else}
                    💾 Save Changes
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {:else}
          <!-- Character Info Display -->
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Character Details</h3>

            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">Visual Description</h4>
                <p class="text-gray-600">{character.visualDescription}</p>
              </div>

              {#if character.personality}
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-1">Personality</h4>
                  <p class="text-gray-600">{character.personality}</p>
                </div>
              {/if}

              {#if character.description}
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                  <p class="text-gray-600">{character.description}</p>
                </div>
              {/if}

              {#if character.seriesId}
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-1">Series</h4>
                  <a href="/series/{character.seriesId}" class="text-spark-600 hover:text-spark-700">
                    View Series →
                  </a>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Character Sheet Gallery -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Character Sheet</h3>
            <span class="text-sm text-gray-500">{characterImages.length} images</span>
          </div>

          {#if characterImages.length === 0}
            <div class="text-center py-8 text-gray-500">
              <div class="text-4xl mb-2">🖼️</div>
              <p>Generate a reference image to start building your character sheet</p>
            </div>
          {:else}
            <div class="grid grid-cols-3 gap-4">
              {#each characterImages as image (image.id)}
                <div class="relative group">
                  <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={image.path} alt={image.label} class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <a
                      href={image.path}
                      target="_blank"
                      class="btn btn-secondary text-xs py-1 px-2"
                    >
                      🔍 View
                    </a>
                    {#if image.id !== 'main'}
                      <button
                        onclick={() => removeImage(image.id)}
                        class="btn btn-secondary text-xs py-1 px-2 text-red-600"
                      >
                        🗑️
                      </button>
                    {/if}
                  </div>
                  <div class="absolute bottom-2 left-2 right-2">
                    <span class="bg-black/70 text-white text-xs px-2 py-1 rounded capitalize">
                      {image.label}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Tips -->
        <div class="card bg-amber-50 border-amber-200">
          <h4 class="text-sm font-medium text-amber-800 mb-2">💡 Character Sheet Tips</h4>
          <ul class="text-xs text-amber-700 space-y-1">
            <li>• Start with a main reference image showing the full character</li>
            <li>• Generate multiple poses to use as reference when creating book illustrations</li>
            <li>• Expression sheets help maintain emotional consistency</li>
            <li>• Use the same style across all character images for consistency</li>
            <li>• Save your visual description - it's the key to consistent AI generation</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Character?</h3>
        <p class="text-gray-600 mb-4">
          Are you sure you want to delete "{character.name}"? This will also remove all reference images. This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <button onclick={() => showDeleteModal = false} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <button onclick={handleDelete} class="btn bg-red-600 text-white hover:bg-red-700 flex-1">
            Delete Character
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}
