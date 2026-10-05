import { z } from "zod";
import type { Answer } from "./copilot";
export type NarrativeResult = {
  status: "generated" | "unconfigured" | "fallback";
  provider: string;
  text?: string;
  citations?: string[];
  reason?: string;
};
export interface NarrativeProvider {
  name: string;
  summarize(answer: Answer, signal: AbortSignal): Promise<unknown>;
}
const output = z
  .object({
    text: z.string().min(1).max(3000),
    citations: z.array(z.string()).min(1).max(20),
  })
  .strict();
export async function narrate(
  answer: Answer,
  provider?: NarrativeProvider,
  timeoutMs = 8000,
): Promise<NarrativeResult> {
  if (!provider)
    return {
      status: "unconfigured",
      provider: "deterministic",
      reason: "No server narrative provider configured.",
    };
  if (answer.intent === "unsupported" || !answer.evidence.length)
    return {
      status: "fallback",
      provider: provider.name,
      reason: "Insufficient approved evidence.",
    };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      provider.summarize(answer, controller.signal),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("deadline"));
        }, timeoutMs);
      }),
    ]);
    const parsed = output.parse(value);
    const allowed = new Set(answer.evidence.map((e) => `${e.type}:${e.id}`));
    if (parsed.citations.some((c) => !allowed.has(c)))
      throw new Error("citation");
    // Numerical tokens cannot introduce measurements absent from the computed answer.
    const numbers = new Set(
      (answer.answer + " " + answer.logic).match(/\d[\d,.]*%?/g) || [],
    );
    if ((parsed.text.match(/\d[\d,.]*%?/g) || []).some((n) => !numbers.has(n)))
      throw new Error("measurement");
    return { status: "generated", provider: provider.name, ...parsed };
  } catch {
    return {
      status: "fallback",
      provider: provider.name,
      reason:
        "Provider timeout, failure or invalid output. Computed answer retained.",
    };
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
