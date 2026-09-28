/**
 * Optional LLM planner provider (PLANNER_PROVIDER=llm + ANTHROPIC_API_KEY secret).
 * The rule-based planner first shortlists real content; Claude then re-ranks that
 * shortlist and writes the "why it matches" copy. Any ID not in the shortlist is
 * discarded, so the model can never invent destinations, resorts, prices or availability.
 * On any error the caller falls back to the rule-based result.
 */
import Anthropic from '@anthropic-ai/sdk';
import { scoreItem, type IndexItem, type PlanResult, type Recommendation } from '../src/lib/planner-core';
import type { Env } from './index';

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'picks'],
  properties: {
    summary: { type: 'string' },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'reasons'],
        properties: { id: { type: 'string' }, reasons: { type: 'array', items: { type: 'string' } } },
      },
    },
  },
} as const;

export async function llmPlan(env: Env, items: IndexItem[], base: PlanResult): Promise<PlanResult | null> {
  const style = base.budgetStyle;
  const shortlist = items
    .filter((i) => i.kind === 'resort' || i.kind === 'destination')
    .map((i) => scoreItem(i, base.input, style))
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  const byKey = new Map(shortlist.map((r) => [`${r.item.kind}:${r.item.id}`, r]));

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const params = {
    model: env.PLANNER_LLM_MODEL || 'claude-opus-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system:
      'You are a travel editor for SpiceVacations.com. Choose up to 6 options from the CANDIDATES list that best fit the traveler, ' +
      'using only candidate ids exactly as given. For each, give 2-3 short reasons grounded only in the candidate data and the request. ' +
      'Never mention prices, discounts, ratings, availability or facts not present in the candidate data. Write in friendly American English. ' +
      'The summary is 1-2 sentences and must remind the traveler that prices and availability are set by providers.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          request: base.input,
          budgetStyle: style ?? null,
          candidates: shortlist.map((r) => ({
            id: `${r.item.kind}:${r.item.id}`,
            name: r.item.title,
            destination: r.item.destinationName,
            summary: r.item.summary,
            styles: [...r.item.vacationTypes, ...r.item.resortTypes],
            idealFor: r.item.idealFor,
            budget: r.item.budget,
            bestMonths: r.item.months,
            adultsOnly: r.item.adultsOnly,
          })),
        }),
      },
    ],
  };
  // `fallbacks` / `output_config` are newer request fields; cast keeps this compiling across SDK versions.
  const res = (await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)) as Anthropic.Beta.BetaMessage;
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!text) return null;
  const out = JSON.parse(text) as { summary: string; picks: { id: string; reasons: string[] }[] };
  const recommendations = out.picks
    .map((p) => {
      const hit = byKey.get(p.id);
      return hit ? { ...hit, reasons: p.reasons.slice(0, 3).map((s) => s.slice(0, 200)) } : null;
    })
    .filter((r): r is Recommendation => r !== null)
    .slice(0, 6);
  if (!recommendations.length) return null;
  return { ...base, summary: out.summary.slice(0, 500), recommendations, provider: 'llm' };
}
