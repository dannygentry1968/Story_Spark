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
// 5 ESSENTIAL STORY ELEMENTS FRAMEWORK (Kindlepreneur)
// ============================================================================

export const STORY_ELEMENTS = {
  unforgettableCharacters: {
    name: 'Unforgettable Characters',
    description: 'Characters with distinct personalities, unexpected traits, clear motivations, and relatable flaws',
    ageGuidelines: {
      '0-2': 'Simple, visually distinctive characters with one clear trait (happy, curious, sleepy)',
      '3-5': 'Characters with 1-2 personality traits, a problem to solve, and emotional reactions kids recognize',
      '5-8': 'Characters with strengths AND weaknesses, unexpected hobbies/quirks, clear goals and fears',
      '8-12': 'Complex characters with internal conflicts, growth arcs, relatable struggles, unique voices'
    }
  },
  suspensefulHook: {
    name: 'Suspenseful Action/Hook',
    description: 'Story hooks that make readers NEED to turn the page - questions, problems, or anticipation',
    ageGuidelines: {
      '0-2': 'Simple anticipation: "What will happen next?" through repetition and patterns',
      '3-5': 'A clear problem introduced early: something lost, someone needs help, a goal to achieve',
      '5-8': 'Stakes that matter to the character, mini-cliffhangers at page turns, building tension',
      '8-12': 'Multiple story questions, chapter hooks, mysteries to solve, escalating challenges'
    }
  },
  realisticDialogue: {
    name: 'Realistic Dialogue',
    description: 'Dialogue that sounds natural, reveals character, and moves the story forward',
    ageGuidelines: {
      '0-2': 'Simple exclamations, animal sounds, repetitive phrases that toddlers can "read along"',
      '3-5': 'Short, natural conversations; characters express feelings directly; fun words to say aloud',
      '5-8': 'Distinct character voices; dialogue shows personality; mix of humor and emotion',
      '8-12': 'Subtext in conversations; unique speech patterns per character; dialogue drives conflict'
    }
  },
  goodStoryline: {
    name: 'Good Storyline',
    description: 'Clear beginning-middle-end with conflict, rising action, climax, and satisfying resolution',
    ageGuidelines: {
      '0-2': 'Simple sequence: problem → attempt → solution. Circular stories that return to start.',
      '3-5': 'Character wants something → faces obstacle → tries solutions → succeeds with lesson learned',
      '5-8': 'Three-act structure with escalating problems, a dark moment, and triumphant resolution',
      '8-12': 'Complex plot with subplots, multiple challenges, character growth tied to plot resolution'
    }
  },
  instantRecall: {
    name: 'Instant Recall Factor',
    description: 'Memorable elements that make the book stick: catchphrases, unique concepts, emotional moments',
    ageGuidelines: {
      '0-2': 'Repetitive refrains, distinctive sounds, bold visual concepts (Very Hungry Caterpillar)',
      '3-5': 'Catchphrases kids repeat, unique character names, emotional climax they remember',
      '5-8': 'Quotable lines, surprising twists, themes that resonate, memorable friendships',
      '8-12': 'Powerful emotional moments, unique world/concept, characters that feel like friends'
    }
  }
} as const;

export type StoryElement = keyof typeof STORY_ELEMENTS;

// Helper to get age-appropriate guidance for all 5 elements
function getStoryElementsGuidance(targetAge: AgeRange): string {
  return Object.entries(STORY_ELEMENTS)
    .map(([key, element]) => {
      const guidance = element.ageGuidelines[targetAge] || element.ageGuidelines['3-5'];
      return `${element.name}: ${guidance}`;
    })
    .join('\n');
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
  hook?: string; // What makes readers NEED to keep reading
  recallFactor?: string; // The memorable element that sticks
  characters: {
    name: string;
    description: string;
    visualDescription: string;
    unexpectedTrait?: string; // Quirky detail that makes them memorable
    want?: string; // What they desire/need
    flaw?: string; // Their weakness or obstacle
    role: 'protagonist' | 'sidekick' | 'antagonist' | 'supporting';
  }[];
  pages: {
    pageNumber: number;
    storyBeat?: 'hook' | 'rising_action' | 'climax' | 'resolution';
    summary: string;
    text: string;
    pageTurnHook?: string; // Why readers need to turn the page
    illustrationPrompt: string;
  }[];
}

export async function generateOutline(request: OutlineRequest): Promise<StoryOutline> {
  const claude = getClient();
  const bookType = BOOK_TYPES[request.bookType];
  const ageRange = AGE_RANGES[request.targetAge];

  // Get age-appropriate guidance for all 5 essential story elements
  const storyElementsGuidance = getStoryElementsGuidance(request.targetAge);

  const systemPrompt = `You are an expert children's book author specializing in ${bookType.name}s for ${ageRange.label} readers. You create BESTSELLING, engaging, age-appropriate stories that captivate young readers while being suitable for publication on Amazon KDP.

## THE 5 ESSENTIAL STORY ELEMENTS (You MUST incorporate ALL of these)

${storyElementsGuidance}

## WRITING EXCELLENCE STANDARDS

Your stories demonstrate:
- "Show, don't tell" - Express emotions through actions and dialogue, not narration
- Deep point of view - Readers experience the story through the character's eyes
- Natural dialogue that sounds like real children/characters speaking
- Page-turn hooks - Every page ending makes readers NEED to see what's next
- Emotional resonance - Moments that make readers FEEL something

## FORMAT SPECIFICATIONS FOR ${bookType.name.toUpperCase()}S

- Page count: ${bookType.pageCount} pages
- Word range: ${ageRange.wordRange[0]}-${ageRange.wordRange[1]} total words
- Reading level: ${ageRange.label}
${bookType.id === 'picture' ? '- Each spread should have one clear, illustratable action moment' : ''}
${bookType.id === 'board' ? '- Simple concepts, repetitive patterns, bold imagery, sounds to read aloud' : ''}
${bookType.id === 'early_reader' ? '- Chapter structure with mini-cliffhangers, sight words, building vocabulary' : ''}

## CHARACTER CREATION RULES

Every character MUST have:
1. A clear want/goal that drives the story
2. At least one flaw or weakness that creates obstacles
3. One unexpected trait (unusual hobby, quirky habit, surprising fear) that makes them memorable
4. A distinct voice in dialogue - how they speak should reveal personality
5. Visual distinctiveness - easy to recognize in every illustration`;

  const userPrompt = `Create a BESTSELLING children's ${bookType.name} outline with this concept:

"${request.concept}"

Target age: ${ageRange.label}
${request.tone ? `Tone: ${request.tone}` : ''}
${request.themes?.length ? `Themes to incorporate: ${request.themes.join(', ')}` : ''}
${request.characters?.length ? `Characters to include: ${request.characters.map(c => `${c.name} - ${c.description}`).join('; ')}` : ''}

## REQUIRED STORY STRUCTURE

Your outline must demonstrate:
1. **HOOK** (Page 1-2): Immediately establish the character and their problem/desire
2. **RISING ACTION**: Escalating obstacles, failed attempts, building tension
3. **CLIMAX**: The moment of greatest tension where everything changes
4. **RESOLUTION**: Satisfying conclusion with emotional payoff and clear takeaway

## OUTPUT FORMAT

Respond with a JSON object:
{
  "title": "Catchy, memorable title",
  "subtitle": "Optional subtitle that adds intrigue",
  "logline": "One compelling sentence that makes people want to read more",
  "theme": "The deeper message/lesson woven naturally into the story",
  "hook": "What question or problem will make readers NEED to keep reading?",
  "recallFactor": "What memorable element will stick with readers? (catchphrase, unique concept, emotional moment)",
  "characters": [
    {
      "name": "Memorable character name",
      "description": "Personality, motivation, and role in story",
      "visualDescription": "Detailed visual description (species, colors, clothing, distinguishing features)",
      "unexpectedTrait": "One quirky/unique detail that makes them unforgettable",
      "want": "What they desire/need",
      "flaw": "Their weakness or obstacle",
      "role": "protagonist|sidekick|antagonist|supporting"
    }
  ],
  "pages": [
    {
      "pageNumber": 1,
      "storyBeat": "hook|rising_action|climax|resolution",
      "summary": "What happens - focus on action and emotion",
      "text": "The actual page text - use dialogue, show don't tell",
      "pageTurnHook": "Why will readers NEED to turn the page?",
      "illustrationPrompt": "Detailed prompt capturing the key visual moment"
    }
  ]
}

Create exactly ${bookType.pageCount} pages. Total word count: ${ageRange.wordRange[0]}-${ageRange.wordRange[1]} words.
Make every page count - no filler. Each page must advance the story or deepen character.`;

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

  // Get dialogue guidance for this age range
  const dialogueGuidance = STORY_ELEMENTS.realisticDialogue.ageGuidelines[request.targetAge]
    || STORY_ELEMENTS.realisticDialogue.ageGuidelines['3-5'];

  const systemPrompt = `You are an expert children's book author writing a ${bookType.name} for ${ageRange.label} readers.

## WRITING EXCELLENCE RULES (Follow ALL of these)

1. **SHOW, DON'T TELL**
   - BAD: "Tommy was scared."
   - GOOD: "Tommy's hands trembled. He squeezed his teddy bear tight."

2. **REALISTIC DIALOGUE**
   ${dialogueGuidance}
   - Dialogue should reveal character personality
   - Use dialogue to move the story forward, not just fill space

3. **DEEP POINT OF VIEW**
   - Let readers experience emotions through the character
   - Use sensory details: what does the character see, hear, feel?

4. **PAGE-TURN HOOKS**
   - End with anticipation, a question, or mid-action
   - Make readers NEED to see what happens next

## FORMAT SPECIFICATIONS
- Target: approximately ${wordsPerPage} words for this page
- Vocabulary: appropriate for ${ageRange.label}
- Style: vivid, visual prose that pairs with illustration
${bookType.id === 'board' ? '- Include fun sounds, simple repetition, bold concepts' : ''}
${bookType.id === 'picture' ? '- Balance narration with dialogue; leave visual details for illustration' : ''}
${bookType.id === 'early_reader' ? '- Use sight words, short sentences, chapter-book pacing' : ''}`;

  const previousContext = request.previousPages?.length
    ? `\n## PREVIOUS PAGES (maintain consistency)\n${request.previousPages.map(p => `Page ${p.pageNumber}: "${p.text}"`).join('\n')}`
    : '';

  const userPrompt = `Write the text for page ${request.pageNumber} of this story:

## STORY CONTEXT
${request.storyContext}

${request.characters?.length ? `## CHARACTERS\n${request.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}` : ''}
${previousContext}

## THIS PAGE SHOULD COVER
${request.pageSummary}

## OUTPUT
Write ONLY the page text. No commentary, no explanations.
Include dialogue where natural. Show emotions through actions.
End with something that makes readers want to turn the page.`;

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
  want?: string; // What they desire/need
  flaw?: string; // Their weakness
  unexpectedTrait?: string; // Surprising detail that makes them memorable
  catchphrase?: string; // Memorable phrase they use
  backstory: string;
  voiceNotes?: string; // How they speak, dialogue style
  illustrationPrompt: string;
}

export async function generateCharacter(request: CharacterRequest): Promise<GeneratedCharacter> {
  const claude = getClient();
  const bookType = BOOK_TYPES[request.bookType];
  const ageRange = AGE_RANGES[request.targetAge];

  // Get character guidance for this age range
  const characterGuidance = STORY_ELEMENTS.unforgettableCharacters.ageGuidelines[request.targetAge]
    || STORY_ELEMENTS.unforgettableCharacters.ageGuidelines['3-5'];

  const systemPrompt = `You are an expert children's book character designer specializing in UNFORGETTABLE characters that readers remember for years.

## UNFORGETTABLE CHARACTER FRAMEWORK

For ${ageRange.label} readers: ${characterGuidance}

## EVERY CHARACTER MUST HAVE:

1. **CLEAR WANT/GOAL** - What drives them through the story?
2. **MEANINGFUL FLAW** - What weakness creates obstacles or conflict?
3. **UNEXPECTED TRAIT** - A surprising detail that makes them unique:
   - Unusual hobby (a dragon who knits, a bunny who loves heavy metal)
   - Quirky habit (counts everything, talks to plants, walks backwards on Tuesdays)
   - Surprising fear (a lion afraid of butterflies, a fish afraid of bubbles)
   - Unexpected talent (a clumsy character who's secretly graceful at one thing)
4. **DISTINCT VOICE** - How do they talk? Catchphrases? Speaking patterns?
5. **VISUAL HOOK** - One visual element that's instantly recognizable

## FOR ${bookType.name.toUpperCase()}S:
- Visually simple but DISTINCTIVE
- Easy to recognize in every illustration
- Silhouette should be recognizable
- Consistent visual details throughout`;

  const userPrompt = `Create an UNFORGETTABLE character profile for:

Name: ${request.name}
Basic concept: ${request.basicDescription}
Role: ${request.role || 'main character'}
${request.storyContext ? `Story context: ${request.storyContext}` : ''}

Respond with JSON:
{
  "name": "${request.name}",
  "description": "Full personality description - what makes them tick?",
  "visualDescription": "Detailed visual description (species/type, size, colors, clothing, accessories, distinguishing features)",
  "personality": "Key personality traits with specific examples of how they manifest",
  "want": "What they deeply desire or need",
  "flaw": "Their weakness or internal obstacle",
  "unexpectedTrait": "The surprising detail that makes them memorable - be specific and creative!",
  "catchphrase": "A memorable phrase or expression they use (optional but encouraged)",
  "backstory": "Brief backstory that explains who they are",
  "voiceNotes": "How do they talk? Formal? Slang? Nervous? What makes their dialogue distinct?",
  "illustrationPrompt": "Complete prompt for generating a reference illustration showing their personality through pose, expression, and visual details"
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

// ============================================================================
// STORY ANALYSIS & IMPROVEMENT (5 Essential Elements)
// ============================================================================

export interface StoryAnalysis {
  overallScore: number; // 1-10
  elementScores: {
    unforgettableCharacters: { score: number; feedback: string; suggestions: string[] };
    suspensefulHook: { score: number; feedback: string; suggestions: string[] };
    realisticDialogue: { score: number; feedback: string; suggestions: string[] };
    goodStoryline: { score: number; feedback: string; suggestions: string[] };
    instantRecall: { score: number; feedback: string; suggestions: string[] };
  };
  strengths: string[];
  weaknesses: string[];
  priorityImprovements: string[];
}

export interface AnalyzeStoryRequest {
  bookType: BookTypeId;
  targetAge: AgeRange;
  title: string;
  pages: { pageNumber: number; text: string }[];
  characters?: { name: string; description: string }[];
}

export async function analyzeStory(request: AnalyzeStoryRequest): Promise<StoryAnalysis> {
  const claude = getClient();
  const bookType = BOOK_TYPES[request.bookType];
  const ageRange = AGE_RANGES[request.targetAge];

  const storyElementsGuidance = getStoryElementsGuidance(request.targetAge);

  const fullText = request.pages.map(p => `Page ${p.pageNumber}: ${p.text}`).join('\n\n');

  const systemPrompt = `You are an expert children's book editor and story analyst. You evaluate stories against the 5 ESSENTIAL STORY ELEMENTS framework, providing specific, actionable feedback.

## THE 5 ESSENTIAL ELEMENTS (Age-appropriate for ${ageRange.label})

${storyElementsGuidance}

## YOUR ANALYSIS APPROACH

1. Be SPECIFIC - quote exact passages when giving feedback
2. Be CONSTRUCTIVE - every criticism should include a concrete improvement suggestion
3. Be AGE-AWARE - judge against what works for ${ageRange.label} readers
4. Be HONEST - don't inflate scores; authors need real feedback to improve`;

  const userPrompt = `Analyze this ${bookType.name} for ${ageRange.label} readers:

TITLE: "${request.title}"

${request.characters?.length ? `CHARACTERS:\n${request.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}\n` : ''}

STORY TEXT:
${fullText}

Provide a detailed analysis as JSON:
{
  "overallScore": 7, // 1-10 overall quality score
  "elementScores": {
    "unforgettableCharacters": {
      "score": 7,
      "feedback": "Specific feedback about character development...",
      "suggestions": ["Specific improvement 1", "Specific improvement 2"]
    },
    "suspensefulHook": {
      "score": 6,
      "feedback": "Specific feedback about hooks and page-turners...",
      "suggestions": ["Specific improvement 1", "Specific improvement 2"]
    },
    "realisticDialogue": {
      "score": 8,
      "feedback": "Specific feedback about dialogue quality...",
      "suggestions": ["Specific improvement 1"]
    },
    "goodStoryline": {
      "score": 7,
      "feedback": "Specific feedback about plot structure...",
      "suggestions": ["Specific improvement 1", "Specific improvement 2"]
    },
    "instantRecall": {
      "score": 5,
      "feedback": "Specific feedback about memorability...",
      "suggestions": ["Specific improvement 1", "Specific improvement 2", "Specific improvement 3"]
    }
  },
  "strengths": ["What this story does well - be specific"],
  "weaknesses": ["Areas needing improvement - be specific"],
  "priorityImprovements": ["The 3 most impactful changes to make, in order of priority"]
}`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
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

  return JSON.parse(jsonStr.trim()) as StoryAnalysis;
}

// ============================================================================
// STORY IMPROVEMENT - Rewrite with Enhanced Elements
// ============================================================================

export interface ImproveStoryRequest {
  bookType: BookTypeId;
  targetAge: AgeRange;
  originalPages: { pageNumber: number; text: string }[];
  characters?: { name: string; description: string }[];
  focusAreas?: StoryElement[]; // Which elements to focus on improving
}

export async function improveStoryPage(
  request: ImproveStoryRequest,
  pageNumber: number,
  improvementFocus: string
): Promise<string> {
  const claude = getClient();
  const ageRange = AGE_RANGES[request.targetAge];
  const bookType = BOOK_TYPES[request.bookType];

  const originalPage = request.originalPages.find(p => p.pageNumber === pageNumber);
  if (!originalPage) {
    throw new Error(`Page ${pageNumber} not found`);
  }

  const contextPages = request.originalPages
    .filter(p => p.pageNumber >= pageNumber - 1 && p.pageNumber <= pageNumber + 1)
    .map(p => `Page ${p.pageNumber}: ${p.text}`)
    .join('\n\n');

  const systemPrompt = `You are an expert children's book editor. Your task is to IMPROVE an existing page while maintaining the story's voice and continuity.

## IMPROVEMENT RULES

1. Keep the same basic events and meaning
2. ENHANCE with the 5 Essential Elements:
   - Make characters more vivid and memorable
   - Add tension/anticipation for page turns
   - Improve dialogue to sound more natural
   - Strengthen emotional beats
   - Add memorable phrases/moments

3. Use "show, don't tell"
4. Maintain age-appropriate language for ${ageRange.label}
5. Keep word count similar to original`;

  const userPrompt = `Improve page ${pageNumber} of this ${bookType.name} for ${ageRange.label} readers.

CONTEXT (surrounding pages):
${contextPages}

ORIGINAL PAGE ${pageNumber}:
"${originalPage.text}"

IMPROVEMENT FOCUS:
${improvementFocus}

${request.characters?.length ? `CHARACTERS:\n${request.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}` : ''}

Write ONLY the improved page text. No explanations.
Maintain similar length but make every word count.`;

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
// WRITING STYLE OPTIONS
// ============================================================================

export const WRITING_STYLES = {
  rhyming: {
    name: 'Rhyming',
    description: 'Consistent rhyme scheme with rhythmic flow',
    guidance: 'Use AABB or ABAB rhyme schemes. Maintain consistent syllable counts. Avoid forced rhymes.'
  },
  prose: {
    name: 'Prose',
    description: 'Natural flowing narrative',
    guidance: 'Clear, vivid sentences. Mix short punchy sentences with longer descriptive ones.'
  },
  repetitive: {
    name: 'Repetitive/Pattern',
    description: 'Repeating phrases that build (great for young children)',
    guidance: 'Establish a refrain or pattern that repeats with variations. Great for read-aloud participation.'
  },
  dialogue_heavy: {
    name: 'Dialogue-Heavy',
    description: 'Story told primarily through character conversations',
    guidance: 'Minimal narration. Let characters reveal story through what they say and how they say it.'
  },
  lyrical: {
    name: 'Lyrical',
    description: 'Poetic, musical prose without strict rhyme',
    guidance: 'Focus on rhythm and sound. Use alliteration, assonance, and metaphor.'
  }
} as const;

export type WritingStyle = keyof typeof WRITING_STYLES;

// ============================================================================
// TENSE & POV OPTIONS
// ============================================================================

export const TENSE_OPTIONS = {
  present: {
    name: 'Present Tense',
    description: 'Events happen NOW - more engaging for young readers',
    example: 'Lily jumps over the puddle. She laughs with joy.'
  },
  past: {
    name: 'Past Tense',
    description: 'Traditional storytelling style',
    example: 'Lily jumped over the puddle. She laughed with joy.'
  }
} as const;

export const POV_OPTIONS = {
  third_limited: {
    name: 'Third Person Limited',
    description: 'Follow one character closely - most common for picture books',
    example: 'Lily felt her heart race as she saw the butterfly.'
  },
  third_omniscient: {
    name: 'Third Person Omniscient',
    description: 'Narrator knows all - good for ensemble casts',
    example: 'While Lily searched the garden, Max was hiding behind the big oak tree.'
  },
  first_person: {
    name: 'First Person',
    description: 'Character tells their own story - very personal',
    example: 'I never thought I could fly until that magical day.'
  },
  second_person: {
    name: 'Second Person',
    description: 'Reader is part of the story - interactive feel',
    example: 'You open the door and see a tiny dragon!'
  }
} as const;
