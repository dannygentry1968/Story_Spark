import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Initialize OpenAI client
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

// Storage path for images
const STORAGE_PATH = env.STORAGE_PATH || './data/storage';

async function ensureStorageDir(subdir: string): Promise<string> {
  const dir = join(STORAGE_PATH, subdir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

// ============================================================================
// IMAGE GENERATION TYPES
// ============================================================================

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'natural' | 'vivid';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
}

export interface ImageResult {
  url: string;
  localPath: string;
  revisedPrompt?: string;
}

export interface CharacterReferenceRequest {
  characterId: string;
  name: string;
  visualDescription: string;
  style: string;
}

export interface PageIllustrationRequest {
  bookId: string;
  pageNumber: number;
  prompt: string;
  style: string;
  characterReferences?: {
    name: string;
    imagePath: string;
  }[];
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

// ============================================================================
// BASE IMAGE GENERATION
// ============================================================================

export async function generateImage(request: ImageGenerationRequest): Promise<ImageResult> {
  const openai = getClient();

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: request.prompt,
    n: 1,
    size: request.size || '1024x1024',
    style: request.style || 'vivid',
    quality: request.quality || 'hd'
  });

  const imageData = response.data[0];
  if (!imageData.url && !imageData.b64_json) {
    throw new Error('No image data in response');
  }

  // Download and save image
  const imageUrl = imageData.url!;
  const timestamp = Date.now();
  const filename = `generated_${timestamp}.png`;

  const storageDir = await ensureStorageDir('generated');
  const localPath = join(storageDir, filename);

  // Fetch and save image
  const imageResponse = await fetch(imageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();
  await writeFile(localPath, Buffer.from(arrayBuffer));

  return {
    url: imageUrl,
    localPath,
    revisedPrompt: imageData.revised_prompt
  };
}

// ============================================================================
// CHARACTER REFERENCE GENERATION
// ============================================================================

export async function generateCharacterReference(
  request: CharacterReferenceRequest
): Promise<ImageResult> {
  const openai = getClient();

  // Build a comprehensive prompt for character reference
  const prompt = `Create a character reference sheet for a children's book character:

Character: ${request.name}
Visual Description: ${request.visualDescription}

Style: ${request.style}, suitable for children's book illustration

Show the character in a clear, front-facing pose with a simple background. The image should serve as a reference for maintaining character consistency across multiple illustrations. Include clear details of their appearance, colors, and any distinctive features.

High quality, professional children's book illustration style.`;

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    style: 'vivid',
    quality: 'hd'
  });

  const imageData = response.data[0];
  if (!imageData.url) {
    throw new Error('No image URL in response');
  }

  // Save to character-specific directory
  const storageDir = await ensureStorageDir(`characters/${request.characterId}`);
  const filename = `reference_${Date.now()}.png`;
  const localPath = join(storageDir, filename);

  const imageResponse = await fetch(imageData.url);
  const arrayBuffer = await imageResponse.arrayBuffer();
  await writeFile(localPath, Buffer.from(arrayBuffer));

  return {
    url: imageData.url,
    localPath,
    revisedPrompt: imageData.revised_prompt
  };
}

// ============================================================================
// PAGE ILLUSTRATION WITH CHARACTER CONSISTENCY
// ============================================================================

export async function generatePageIllustration(
  request: PageIllustrationRequest
): Promise<ImageResult> {
  const openai = getClient();

  // Build prompt with character context
  let prompt = request.prompt;

  // If we have character references, include them in the prompt context
  if (request.characterReferences?.length) {
    const characterDescriptions = request.characterReferences
      .map(c => `- ${c.name} (as shown in reference images)`)
      .join('\n');

    prompt = `${request.prompt}

Characters in this scene should match their reference images exactly:
${characterDescriptions}

Style: ${request.style}, children's book illustration, consistent with character reference sheets.`;
  } else {
    prompt = `${request.prompt}

Style: ${request.style}, professional children's book illustration.`;
  }

  // Note: For true character consistency, OpenAI's API supports reference images
  // through the "image" parameter in edit mode. For now, we use detailed prompts.
  // In production, you'd use the Responses API for multi-turn editing with references.

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: request.size || '1024x1024',
    style: 'vivid',
    quality: 'hd'
  });

  const imageData = response.data[0];
  if (!imageData.url) {
    throw new Error('No image URL in response');
  }

  // Save to book-specific directory
  const storageDir = await ensureStorageDir(`books/${request.bookId}/pages`);
  const filename = `page_${request.pageNumber}_${Date.now()}.png`;
  const localPath = join(storageDir, filename);

  const imageResponse = await fetch(imageData.url);
  const arrayBuffer = await imageResponse.arrayBuffer();
  await writeFile(localPath, Buffer.from(arrayBuffer));

  return {
    url: imageData.url,
    localPath,
    revisedPrompt: imageData.revised_prompt
  };
}

// ============================================================================
// COVER ART GENERATION
// ============================================================================

export interface CoverRequest {
  bookId: string;
  title: string;
  subtitle?: string;
  style: string;
  mainCharacter?: {
    name: string;
    visualDescription: string;
  };
  scene?: string;
  mood?: string;
}

export async function generateCoverArt(request: CoverRequest): Promise<ImageResult> {
  const openai = getClient();

  const prompt = `Create a captivating children's book cover illustration:

Title: "${request.title}"
${request.subtitle ? `Subtitle: "${request.subtitle}"` : ''}
${request.mainCharacter ? `Main character: ${request.mainCharacter.name} - ${request.mainCharacter.visualDescription}` : ''}
${request.scene ? `Scene: ${request.scene}` : ''}
${request.mood ? `Mood: ${request.mood}` : ''}

Style: ${request.style}, professional children's book cover art

Requirements:
- Eye-catching composition that works as a book cover
- Leave space at top for title text
- Vibrant colors appropriate for children's book
- High quality, print-ready illustration
- Portrait orientation suitable for book cover`;

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1792', // Portrait for book cover
    style: 'vivid',
    quality: 'hd'
  });

  const imageData = response.data[0];
  if (!imageData.url) {
    throw new Error('No image URL in response');
  }

  const storageDir = await ensureStorageDir(`books/${request.bookId}/covers`);
  const filename = `cover_${Date.now()}.png`;
  const localPath = join(storageDir, filename);

  const imageResponse = await fetch(imageData.url);
  const arrayBuffer = await imageResponse.arrayBuffer();
  await writeFile(localPath, Buffer.from(arrayBuffer));

  return {
    url: imageData.url,
    localPath,
    revisedPrompt: imageData.revised_prompt
  };
}

// ============================================================================
// IMAGE EDITING / VARIATION
// ============================================================================

export interface ImageEditRequest {
  imagePath: string;
  prompt: string;
  mask?: string; // Optional mask for targeted editing
}

export async function editImage(request: ImageEditRequest): Promise<ImageResult> {
  const openai = getClient();

  // Read the source image
  const imageBuffer = await readFile(request.imagePath);
  const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

  // Create edit request
  const response = await openai.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: request.prompt,
    n: 1,
    size: '1024x1024'
  });

  const imageData = response.data[0];
  if (!imageData.url) {
    throw new Error('No image URL in response');
  }

  // Save edited image
  const storageDir = await ensureStorageDir('edited');
  const filename = `edited_${Date.now()}.png`;
  const localPath = join(storageDir, filename);

  const imageResponse = await fetch(imageData.url);
  const arrayBuffer = await imageResponse.arrayBuffer();
  await writeFile(localPath, Buffer.from(arrayBuffer));

  return {
    url: imageData.url,
    localPath
  };
}

// ============================================================================
// ILLUSTRATION STYLES
// ============================================================================

export const ILLUSTRATION_STYLES = {
  watercolor: 'soft watercolor illustration with gentle colors and organic textures',
  digital: 'clean digital illustration with vibrant colors and smooth gradients',
  cartoon: 'playful cartoon style with bold outlines and bright colors',
  storybook: 'classic storybook illustration with warm, nostalgic feel',
  whimsical: 'whimsical and magical illustration with fantastical elements',
  minimalist: 'minimalist illustration with simple shapes and limited color palette',
  collage: 'paper collage style with textured layers and cut-out shapes',
  pencil: 'detailed pencil sketch style with soft shading',
  flat: 'modern flat illustration with geometric shapes and bold colors'
} as const;

export type IllustrationStyle = keyof typeof ILLUSTRATION_STYLES;

export function getStylePrompt(style: IllustrationStyle): string {
  return ILLUSTRATION_STYLES[style] || ILLUSTRATION_STYLES.storybook;
}
