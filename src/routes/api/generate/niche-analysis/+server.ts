import type { RequestHandler } from './$types';
import { success, failure } from '$lib/api/utils';
import { getClaude } from '$lib/services';

interface NicheAnalysisRequest {
  query: string;
  analysisType: 'trends' | 'competition' | 'ideas' | 'full';
  category?: string;
  targetAge?: string;
}

interface TrendData {
  topic: string;
  trendLevel: 'rising' | 'stable' | 'declining';
  popularity: number; // 1-10
  seasonality?: string;
  notes: string;
}

interface CompetitionData {
  level: 'low' | 'medium' | 'high';
  estimatedBooks: string;
  topCompetitors: string[];
  marketGaps: string[];
  difficulty: number; // 1-10
  recommendations: string[];
}

interface BookIdeaData {
  title: string;
  concept: string;
  targetAge: string;
  uniqueAngle: string;
  estimatedDemand: 'low' | 'medium' | 'high';
  keywords: string[];
}

interface NicheAnalysisResponse {
  query: string;
  analysisType: string;
  trends?: TrendData[];
  competition?: CompetitionData;
  bookIdeas?: BookIdeaData[];
  summary: string;
  opportunityScore: number; // 1-100
  recommendations: string[];
}

/**
 * POST /api/generate/niche-analysis - AI-powered niche research
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: NicheAnalysisRequest = await request.json();

    if (!data.query?.trim()) {
      return failure('Query is required', 400);
    }

    const claude = getClaude();

    // Build the analysis prompt based on type
    let systemPrompt = `You are an expert Amazon KDP market researcher specializing in children's books.
You have deep knowledge of:
- Children's book market trends and seasonal patterns
- Amazon search algorithms and discoverability
- Age-appropriate content for different groups (0-2, 3-5, 5-8, 8-12)
- Successful book concepts and what makes them sell
- Competition analysis in the self-publishing space

Always provide actionable, specific insights that help authors make informed decisions.
Be honest about competition levels and realistic about market opportunities.`;

    let userPrompt = '';

    switch (data.analysisType) {
      case 'trends':
        userPrompt = `Analyze current market trends for children's books related to: "${data.query}"
${data.category ? `Category focus: ${data.category}` : ''}
${data.targetAge ? `Target age: ${data.targetAge}` : ''}

Provide your analysis in the following JSON format:
{
  "trends": [
    {
      "topic": "specific trend topic",
      "trendLevel": "rising" | "stable" | "declining",
      "popularity": 1-10 score,
      "seasonality": "when this topic is most popular, if applicable",
      "notes": "brief explanation of this trend"
    }
  ],
  "summary": "2-3 sentence overall market summary",
  "opportunityScore": 1-100 score for overall opportunity,
  "recommendations": ["specific actionable recommendation 1", "recommendation 2", "recommendation 3"]
}

Identify 4-6 relevant trends. Be specific to children's books and KDP publishing.`;
        break;

      case 'competition':
        userPrompt = `Analyze the competition level for children's books in: "${data.query}"
${data.category ? `Category: ${data.category}` : ''}
${data.targetAge ? `Target age: ${data.targetAge}` : ''}

Provide your analysis in the following JSON format:
{
  "competition": {
    "level": "low" | "medium" | "high",
    "estimatedBooks": "estimated number of competing books (e.g., '500-1000')",
    "topCompetitors": ["type of successful books in this niche", "another type"],
    "marketGaps": ["underserved angle 1", "underserved angle 2", "underserved angle 3"],
    "difficulty": 1-10 difficulty score for new entrants,
    "recommendations": ["how to differentiate", "specific strategy", "what to avoid"]
  },
  "summary": "2-3 sentence competition summary",
  "opportunityScore": 1-100 score based on competition analysis,
  "recommendations": ["actionable recommendation 1", "recommendation 2"]
}

Be realistic and specific. Consider both quantity and quality of competition.`;
        break;

      case 'ideas':
        userPrompt = `Generate creative children's book ideas for: "${data.query}"
${data.category ? `Category: ${data.category}` : ''}
${data.targetAge ? `Target age: ${data.targetAge}` : ''}

Provide 5-7 unique book ideas in the following JSON format:
{
  "bookIdeas": [
    {
      "title": "catchy book title",
      "concept": "2-3 sentence concept description",
      "targetAge": "specific age range",
      "uniqueAngle": "what makes this different from existing books",
      "estimatedDemand": "low" | "medium" | "high",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ],
  "summary": "overall theme of these ideas and why they could work",
  "opportunityScore": 1-100 score for this niche overall,
  "recommendations": ["tip for executing these ideas", "what to focus on"]
}

Make ideas specific, marketable, and appropriate for self-publishing. Include a mix of picture books, activity books, and early readers where appropriate.`;
        break;

      default: // 'full'
        userPrompt = `Provide a comprehensive market analysis for children's books related to: "${data.query}"
${data.category ? `Category: ${data.category}` : ''}
${data.targetAge ? `Target age: ${data.targetAge}` : ''}

Include trends, competition analysis, and book ideas in the following JSON format:
{
  "trends": [
    {
      "topic": "trend topic",
      "trendLevel": "rising" | "stable" | "declining",
      "popularity": 1-10,
      "seasonality": "seasonal pattern if any",
      "notes": "brief explanation"
    }
  ],
  "competition": {
    "level": "low" | "medium" | "high",
    "estimatedBooks": "estimated competing books",
    "topCompetitors": ["competitor type 1", "competitor type 2"],
    "marketGaps": ["gap 1", "gap 2", "gap 3"],
    "difficulty": 1-10,
    "recommendations": ["strategy 1", "strategy 2"]
  },
  "bookIdeas": [
    {
      "title": "book title",
      "concept": "concept description",
      "targetAge": "age range",
      "uniqueAngle": "differentiator",
      "estimatedDemand": "low" | "medium" | "high",
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "summary": "comprehensive 3-4 sentence market summary",
  "opportunityScore": 1-100,
  "recommendations": ["key recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"]
}

Provide 3-4 trends, comprehensive competition analysis, and 4-5 book ideas.`;
    }

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return failure('No response from AI', 500);
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return failure('Failed to parse analysis response', 500);
    }

    const analysis = JSON.parse(jsonMatch[0]) as NicheAnalysisResponse;
    analysis.query = data.query;
    analysis.analysisType = data.analysisType;

    return success(analysis);
  } catch (err) {
    console.error('Niche analysis error:', err);
    return failure(
      err instanceof Error ? err.message : 'Failed to analyze niche',
      500
    );
  }
};
