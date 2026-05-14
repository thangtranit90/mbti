import Anthropic from '@anthropic-ai/sdk';
import type { MBTIType, CuratedInsightRow } from '@mbti/shared';
import type { Bindings } from '../types/bindings';
import { getCuratedInsight } from './db';
import { FALLBACK_INSIGHT } from './fallback';

const AI_TIMEOUT_MS = 2500;

function summarizeAnswers(answers: Array<{ questionId: string; value: number }>): string {
  if (answers.length === 0) return 'no answers recorded';
  const byDim = new Map<string, number[]>([
    ['EI', []],
    ['SN', []],
    ['TF', []],
    ['JP', []],
  ]);
  for (const a of answers) {
    const prefix = a.questionId.toLowerCase();
    if (prefix.includes('ei') || prefix.includes('e_i')) byDim.get('EI')!.push(a.value);
    else if (prefix.includes('sn') || prefix.includes('s_n')) byDim.get('SN')!.push(a.value);
    else if (prefix.includes('tf') || prefix.includes('t_f')) byDim.get('TF')!.push(a.value);
    else if (prefix.includes('jp') || prefix.includes('j_p')) byDim.get('JP')!.push(a.value);
  }
  const parts: string[] = [];
  for (const [dim, vals] of byDim) {
    if (vals.length === 0) continue;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    parts.push(`${dim} avg=${avg.toFixed(2)} (n=${vals.length})`);
  }
  return parts.length > 0 ? parts.join(', ') : `${answers.length} responses recorded`;
}

function buildPrompt(
  mbtiType: MBTIType,
  declaredType: MBTIType | null,
  answers: Array<{ questionId: string; value: number }>,
  curatedVariants: CuratedInsightRow[],
): string {
  const exampleInsights = curatedVariants
    .slice(0, 2)
    .map((r) => `- ${r.content}`)
    .join('\n');

  const selfAwareness =
    declaredType && declaredType !== mbtiType
      ? `The user thought they were ${declaredType} but calculated as ${mbtiType}.`
      : declaredType === mbtiType
        ? `The user correctly predicted their type as ${mbtiType}.`
        : `The user did not declare a type.`;

  return `You are writing a behavioral personality insight in Vietnamese for someone who just completed an MBTI assessment.

Type: ${mbtiType}
${selfAwareness}
Answer pattern: ${summarizeAnswers(answers)}

Write ONE sentence of behavioral insight in Vietnamese. Rules:
- Reference observable behavior tied to the answer pattern above, not type theory
- Avoid words: MBTI, introvert, extrovert, type, personality
- Tone: precise and slightly uncomfortable — the reader should think "how does it know?"
- Length: exactly 1 sentence, 20–40 words
- Language: Vietnamese only

Example style (do not copy, write something new):
${exampleInsights}

Respond with ONLY the single Vietnamese sentence. No preamble, no quotes, no explanation.`;
}

export async function generateInsight(
  db: D1Database,
  env: Bindings,
  mbtiType: MBTIType,
  declaredType: MBTIType | null,
  answers: Array<{ questionId: string; value: number }>,
  curatedVariants: CuratedInsightRow[],
): Promise<{ content: string; source: 'ai' | 'curated' }> {
  const prompt = buildPrompt(mbtiType, declaredType, answers, curatedVariants);
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const aiCall = (async () => {
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal },
    );
    if (msg.stop_reason === 'max_tokens') {
      throw new Error('AI response truncated (max_tokens)');
    }
    const block = msg.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Unexpected non-text response from Claude');
    }
    return block.text.trim();
  })();

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new Error('AI_TIMEOUT'));
    }, AI_TIMEOUT_MS);
  });

  try {
    const content = await Promise.race([aiCall, timeout]);
    if (!content) throw new Error('Empty AI response');
    return { content, source: 'ai' };
  } catch (err) {
    console.error('[ai.ts] AI generation failed:', err);
    controller.abort();
    const fallback = await getCuratedInsight(db, mbtiType);
    return { content: fallback?.content ?? FALLBACK_INSIGHT, source: 'curated' };
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
