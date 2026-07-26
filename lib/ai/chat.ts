import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import { auditSafe } from "@/lib/audit/log";
import { parseAiIntent } from "@/lib/ai/parse";
import { executeAiIntent } from "@/lib/ai/execute";
import type { AiChatResponse, AiIntentId } from "@/lib/ai/types";
import type { MetricPeriod } from "@/lib/ai/metrics";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function getOrCreateConversation(
  companyId: string,
  userId: string
) {
  const existing = await db.aiConversation.findFirst({
    where: { companyId, userId },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;
  return db.aiConversation.create({
    data: {
      companyId,
      userId,
      title: "یاریدەدەری زیرەک",
    },
  });
}

export async function listMessages(
  companyId: string,
  userId: string,
  take = 40
) {
  const convo = await getOrCreateConversation(companyId, userId);
  const messages = await db.aiMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    take,
  });
  return { conversationId: convo.id, messages };
}

async function loadParseContext(conversationId: string) {
  const lastAssistant = await db.aiMessage.findFirst({
    where: { conversationId, role: "assistant", intent: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { intent: true, metadata: true },
  });
  if (!lastAssistant?.intent) {
    return { lastIntent: null as AiIntentId | null, lastPeriod: null as MetricPeriod | null };
  }
  const meta = lastAssistant.metadata as { period?: MetricPeriod } | null;
  return {
    lastIntent: lastAssistant.intent as AiIntentId,
    lastPeriod: meta?.period ?? null,
  };
}

export async function askAiAssistant(input: {
  companyId: string;
  userId: string;
  message: string;
  req?: Request | null;
}): Promise<{
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  response: AiChatResponse;
}> {
  const text = input.message.trim().slice(0, 500);
  if (!text) {
    throw new Error("Empty message");
  }

  const convo = await getOrCreateConversation(input.companyId, input.userId);
  const context = await loadParseContext(convo.id);
  const parsed = parseAiIntent(text, context);
  const response = await executeAiIntent(input.companyId, parsed);

  const userMsg = await db.aiMessage.create({
    data: {
      conversationId: convo.id,
      role: "user",
      content: text,
      intent: parsed.intent,
      metadata: toJson({
        confidence: parsed.confidence,
        query: parsed.query || null,
        period: parsed.period || null,
        fromFollowUp: parsed.fromFollowUp || false,
      }),
    },
  });

  const assistantMsg = await db.aiMessage.create({
    data: {
      conversationId: convo.id,
      role: "assistant",
      content: response.reply,
      intent: response.intent,
      metadata: toJson({
        links: response.links || [],
        suggestions: response.suggestions || [],
        data: response.data || null,
        period: response.period || parsed.period || null,
      }),
    },
  });

  await db.aiConversation.update({
    where: { id: convo.id },
    data: {
      title: text.slice(0, 60),
      updatedAt: new Date(),
    },
  });

  await auditSafe({
    companyId: input.companyId,
    userId: input.userId,
    module: "SYSTEM",
    action: "OTHER",
    entityType: "AiConversation",
    entityId: convo.id,
    summary: `AI Assistant: ${parsed.intent}`,
    metadata: {
      ai: true,
      intent: parsed.intent,
      confidence: parsed.confidence,
      period: parsed.period || null,
    },
    req: input.req,
  });

  return {
    conversationId: convo.id,
    userMessageId: userMsg.id,
    assistantMessageId: assistantMsg.id,
    response,
  };
}
