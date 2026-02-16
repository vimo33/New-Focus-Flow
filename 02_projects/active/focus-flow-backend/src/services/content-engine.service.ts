import { cachedInference } from './cached-inference.service';

export type ContentType = 'blog_post' | 'documentation' | 'proposal' | 'marketing_copy' | 'social_post' | 'email';
export type ContentTone = 'professional' | 'casual' | 'technical' | 'persuasive';

export interface ContentRequest {
  content_type: ContentType;
  brief: string;
  project_id?: string;
  tone?: ContentTone;
  max_length?: number;
}

export interface ContentResult {
  content: string;
  content_type: ContentType;
  word_count: number;
  model_used: string;
}

const SYSTEM_PROMPTS: Record<ContentType, string> = {
  blog_post: `You are an expert blog writer. Write engaging, well-structured blog posts with a clear introduction, body sections with subheadings, and a compelling conclusion. Use markdown formatting.`,
  documentation: `You are a technical documentation writer. Write clear, precise documentation with proper structure, code examples where relevant, and easy-to-follow instructions. Use markdown formatting.`,
  proposal: `You are a business proposal writer. Write persuasive, well-structured proposals that clearly define the problem, proposed solution, benefits, timeline, and next steps.`,
  marketing_copy: `You are a marketing copywriter. Write compelling, action-oriented copy that highlights benefits, creates urgency, and drives the reader toward a clear call to action.`,
  social_post: `You are a social media content creator. Write concise, engaging posts optimized for social platforms. Include relevant hashtag suggestions. Keep it punchy and shareable.`,
  email: `You are a professional email writer. Write clear, well-structured emails with an appropriate greeting, concise body, and clear call to action. Match the tone to the context.`,
};

const TONE_INSTRUCTIONS: Record<ContentTone, string> = {
  professional: 'Use a professional, polished tone suitable for business audiences.',
  casual: 'Use a friendly, conversational tone that feels approachable and human.',
  technical: 'Use a precise, technical tone with accurate terminology for expert audiences.',
  persuasive: 'Use a persuasive, compelling tone that motivates action and builds conviction.',
};

class ContentEngineService {
  async generate(request: ContentRequest): Promise<ContentResult> {
    const {
      content_type,
      brief,
      project_id,
      tone = 'professional',
      max_length = 2000,
    } = request;

    const systemPrompt = [
      SYSTEM_PROMPTS[content_type],
      TONE_INSTRUCTIONS[tone],
      `Target length: approximately ${max_length} words. Do not exceed this significantly.`,
    ].join('\n\n');

    const userPrompt = `Write the following ${content_type.replace(/_/g, ' ')}:\n\n${brief}`;

    const result = await cachedInference.infer({
      task_type: 'content_creation',
      budget_tier: 'standard',
      system_prompt: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      project_id,
      max_tokens: Math.min(max_length * 2, 8000),
      temperature: 0.7,
    });

    const content = result.content;
    const word_count = content.split(/\s+/).filter(Boolean).length;

    return {
      content,
      content_type,
      word_count,
      model_used: result.model,
    };
  }
}

export const contentEngine = new ContentEngineService();
