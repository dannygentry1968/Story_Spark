import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { BOOK_TYPES, AGE_RANGES, type BookTypeId, type AgeRange } from '$lib/types';

// Initialize Claude client
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Export for direct access to Claude client
export function getClaude(): Anthropic {
  return getClient();
}

// ============================================================================
// STORY OUTLINE GENERATION
// ============================================================================

export interface OutlineRequest {
  bookType: BookTypeId;
  targetAge: AgeRange;
  concept: string;
  characters?: { name: string; description: string }[];
  tone?: string;
  themes?: string[];
}

export interface StoryOutline {
  title: string;
  subtitle?: string;
  logline: string;
  theme: string;
  characters: {
    name: string;
    description: string;
    visualDescription: string;
    role: 'protagonist' | 'sidekick' | 'antagonist' | 'supporting';
  }[];
  pages: {
    pageNumber: number;
    summary: string;
    text: string;
    illustrationPrompt: string;
  }[];
}

export async function generateOutline(request: OutlineRequest): Promise<StoryOutline> {
  const claude = getClient();
  const bookType = BOOK_TYPES[request.bookType];
  const ageRange = AGE_RANGES[request.targetAge];

  const systemPrompt = `You are an expert children's book author specializing in ${bookType.name}s for ${ageRange.label} readers. You create engaging, age-appropriate stories that captivate young readers while being suitable for publication on Amazon KDP.

Your stories have:
- Clear narrative arcs appropriate for the age group
- Memorable, relatable characters
- Vivid scenes that translate well to illustration
- Educational or emotional value
- Appropriate vocabulary and sentence length for the target age

For ${bookType.name}s:
- Page count: ${bookType.pageCount} pages
- Word range: ${ageRange.wordRange[0]}-${ageRange.wordRange[1]} total words
${bookType.id === 'picture' ? '- Each spread should have one clear illustration moment' : ''}
${bookType.id === 'board' ? '- Simple concepts, repetitive patterns, bold imagery' : ''}
${bookType.id === 'early_reader' ? '- Chapter structure with cliffhangers, sight words' : ''}`;

  const userPrompt = `Create a complete story outline for a children's ${bookType.name} with this concept:

"${request.concept}"

Target age: ${ageRange.label}
${request.tone ? `Tone: ${request.tone}` : ''}
${request.themes?.length ? `Themes to incorporate: ${request.themes.join(', ')}` : ''}
${request.characters?.length ? `Characters to include: ${request.characters.map(c => `${c.name} - ${c.description}`).join('; ')}` : ''}

Respond with a JSON object containing:
{
  "title": "Book title",
  "subtitle": "Optional subtitle",
  "logline": "One sentence summary",
  "theme": "Core theme/message",
  "characters": [
    {
      "name": "Character name",
      "description": "Personality and role in story",
      "visualDescription": "Detailed visual description for illustration (species, colors, clothing, distinguishing features)",
      "role": "protagonist|sidekick|antagonist|supporting"
    }
  ],
  "pages": [
    {
      "pageNumber": 1,
      "summary": "What happens on this page",
      "text": "The actual text for this page",
      "illustrationPrompt": "Detailed prompt for illustrating this page"
    }
  ]
}

Create exactly ${bookType.pageCount} pages. Ensure the text for each page is age-appropriate and the total word count is within ${ageRange.wordRange[0]}-${ageRange.wordRange[1]} words.`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON (handle markdown code blocks)
  let jsonStr = content.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonStr.trim()) as StoryOutline;
  } catch (e) {
    console.error('Failed to parse Claude response:', content.text);
    throw new Error('Failed to parse story outline from Claude response');
  }
}

// ============================================================================
// PAGE TEXT GENERATION
// ============================================================================

export interface PageTextRequest {
  bookType: BookTypeId;
  targetAge: AgeRange;
  storyContext: string;
  pageNumber: number;
  pageSummary: string;
  previousPages?: { pageNumber: number; text: string }[];
  characters?: { name: string; description: string }[];
}

export async function generatePageText(request: PageTextRequest): Promise<string> {
  const claude = getClient();
  const bookType = BOOK_TYPES[request.bookType];
  const ageRange = AGE_RANGES[request.targetAge];

  const wordsPerPage = Math.floor(
    (ageRange.wordRange[0] + ageRange.wordRange[1]) / 2 / bookType.pageCount
  );

  const systemPrompt = `You are an expert children's book author. Write engaging, age-appropriate text for a single page of a ${bookType.name} for ${ageRange.label} readers.

Guidelines:
- Target approximately ${wordsPerPage} words for this page
- Use vocabulary appropriate for ${ageRange.label}
- Create vivid, visual prose that complements illustration
- Maintain consistent voice and tone throughout
- End pages with natural breaks that encourage page turns`;

  const previousContext = request.previousPages?.length
    ? `Previous pages:\n${request.previousPages.map(p => `Page ${p.pageNumber}: "${p.text}"`).join('\n')}`
    : '';

  const userPrompt = `Write the text for page ${request.pageNumber} of this story:

Story concept: ${request.storyContext}
${request.characters?.length ? `Characters: ${request.characters.map(c => c.name).join(', ')}` : ''}

${previousContext}

Page ${request.pageNumber} should cover: ${request.pageSummary}

Write ONLY the page text, no additional commentary.`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return content.text.trim();
}

// ============================================================================
// KDP LISTING GENERATION
// ============================================================================

export interface ListingRequest {
  title: string;
  bookType: BookTypeId;
  targetAge: AgeRange;
  storySummary: string;
  themes?: string[];
  characters?: string[];
}

export interface GeneratedListing {
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  categories: string[];
  backCoverText: string;
}

export async function generateListing(request: ListingRequest): Promise<GeneratedListing> {
  const claude = getClient();
  const ageRange = AGE_RANGES[request.targetAge];

  const systemPrompt = `You are an expert Amazon KDP listing copywriter specializing in children's books. You write compelling, keyword-rich listings that convert browsers into buyers while being accurate and honest about the book's content.

Your listings:
- Hook parents/gift-givers with emotional benefits
- Include relevant keywords naturally
- Highlight educational value and age-appropriateness
- Use HTML formatting for readability (bold, line breaks)
- Stay within Amazon's guidelines`;

  const userPrompt = `Create a complete Amazon KDP listing for this children's book:

Title: ${request.title}
Type: ${BOOK_TYPES[request.bookType].name}
Target age: ${ageRange.label}
Story summary: ${request.storySummary}
${request.themes?.length ? `Themes: ${request.themes.join(', ')}` : ''}
${request.characters?.length ? `Main characters: ${request.characters.join(', ')}` : ''}

Respond with JSON:
{
  "title": "Optimized title (max 200 chars)",
  "subtitle": "Compelling subtitle (max 200 chars)",
  "description": "HTML-formatted description (max 4000 chars) with <b>, <br>, <ul>, <li> tags",
  "keywords": ["keyword1", "keyword2", ...] (exactly 7 keywords, each max 50 chars),
  "categories": ["BISAC code 1", "BISAC code 2"] (2 most relevant BISAC codes),
  "backCoverText": "Short compelling text for back cover (max 200 words)"
}`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  let jsonStr = content.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  return JSON.parse(jsonStr.trim()) as GeneratedListing;
}

// ============================================================================
// CHARACTER DESCRIPTION GENERATION
// ============================================================================

export interface CharacterRequest {
  name: string;
  basicDescription: string;
  bookType: BookTypeId;
  targetAge: AgeRange;
  role?: string;
  storyContext?: string;
}

export interface GeneratedCharacter {
  name: string;
  description: string;
  visualDescription: string;
  personality: string;
  backstory: string;
  illustrationPrompt: string;
}

export async function generateCharacter(request: CharacterRequest): Promise<GeneratedCharacter> {
  const claude = getClient();
  const bookType = BOOK_TYPES[request.bookType];

  const systemPrompt = `You are an expert children's book character designer. You create memorable, visually distinctive characters that resonate with young readers and translate beautifully to illustration.

For ${bookType.name}s, characters should be:
- Visually simple but distinctive
- Easy to recognize across multiple illustrations
- Age-appropriate and relatable
- Consistent in their visual details`;

  const userPrompt = `Create a detailed character profile for:

Name: ${request.name}
Basic concept: ${request.basicDescription}
Role: ${request.role || 'main character'}
${request.storyContext ? `Story context: ${request.storyContext}` : ''}

Respond with JSON:
{
  "name": "${request.name}",
  "description": "Full personality and character description",
  "visualDescription": "Detailed visual description (species/type, size, colors, clothing, accessories, distinguishing features)",
  "personality": "Key personality traits",
  "backstory": "Brief backstory if relevant",
  "illustrationPrompt": "Complete prompt for generating a reference illustration of this character, including style, pose, and all visual details"
}`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  let jsonStr = content.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  return JSON.parse(jsonStr.trim()) as GeneratedCharacter;
}

// ============================================================================
// ILLUSTRATION PROMPT ENHANCEMENT
// ============================================================================

export async function enhanceIllustrationPrompt(
  basicPrompt: string,
  style: string,
  characters?: { name: string; visualDescription: string }[]
): Promise<string> {
  const claude = getClient();

  const characterContext = characters?.length
    ? `Characters in this scene:\n${characters.map(c => `- ${c.name}: ${c.visualDescription}`).join('\n')}`
    : '';

  const userPrompt = `Enhance this illustration prompt for AI image generation:

Basic prompt: "${basicPrompt}"
Art style: ${style}
${characterContext}

Create a detailed, specific prompt that will generate a high-quality children's book illustration. Include:
- Composition and framing
- Lighting and mood
- Color palette suggestions
- Character poses and expressions (if applicable)
- Background details
- Art style specifications

Respond with ONLY the enhanced prompt, no other text.`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return content.text.trim();
}
