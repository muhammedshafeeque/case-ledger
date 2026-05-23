import { prisma } from "../../lib/prisma.js";
import { getEnv } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { writeAuditLog } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";

export async function assembleCaseContext(caseId: string) {
  const c = await prisma.rtiCase.findUnique({
    where: { id: caseId },
    include: {
      facts: true,
      documents: true,
      alerts: true,
      caseEntities: { include: { entity: true } },
    },
  });
  if (!c) throw AppError.notFound();
  return {
    case: { rtiId: c.rtiId, title: c.title, department: c.department, status: c.status },
    facts: c.facts.map((f) => ({ type: f.factType, content: f.content, amount: f.amount?.toString() })),
    evasions: c.documents.filter((d) => d.notAnswered).map((d) => d.notAnswered),
    alerts: c.alerts.map((a) => a.title),
    entities: c.caseEntities.map((ce) => ce.entity.name),
  };
}

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

/** On-demand LLM via Groq OpenAI-compatible API */
export async function callGroq(system: string, userMessage: string, userId: string, caseId?: string) {
  const env = getEnv();
  if (!env.GROQ_API_KEY) {
    return {
      unavailable: true,
      message: "AI service unavailable. Set GROQ_API_KEY in server/.env",
      draft: null,
    };
  }

  const response = await fetch(`${env.GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const data = (await response.json()) as GroqChatResponse;

  if (!response.ok) {
    logger.error("Groq API error", { status: response.status, error: data.error?.message });
    throw AppError.badRequest(data.error?.message ?? "AI request failed");
  }

  const text = data.choices?.[0]?.message?.content ?? "";

  await writeAuditLog({
    eventType: "ai_call",
    userId,
    caseId,
    description: "Groq API call",
    inputData: { model: env.GROQ_MODEL, promptLength: userMessage.length },
    result: "success",
  });

  return { unavailable: false, draft: text, hypothesis: true, provider: "groq" as const };
}

/** @deprecated Use callGroq */
export const callClaude = callGroq;

export async function draftAppeal(caseId: string, appealType: string, userId: string) {
  const context = await assembleCaseContext(caseId);
  const system = `You are an RTI legal expert for Kerala, India. Draft a ${appealType} under the RTI Act 2005. Cite specific sections. Mark output as DRAFT for human review.`;
  return callGroq(system, JSON.stringify(context, null, 2), userId, caseId);
}

export async function chat(messages: string, caseId: string | undefined, userId: string) {
  const context = caseId ? await assembleCaseContext(caseId) : {};
  const system = `RTI Watch investigation assistant. Use only provided context. Never assert facts not in context. Label uncertain inferences as hypothesis.`;
  return callGroq(system, `${JSON.stringify(context)}\n\nUser: ${messages}`, userId, caseId);
}
