import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { auditSafe } from "@/lib/audit/log";
import { parseAiIntent } from "@/lib/ai/parse";
import { executeAiIntent } from "@/lib/ai/execute";
import type { AiChatResponse } from "@/lib/ai/types";

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
      title: "AI Assistant",
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
  const parsed = parseAiIntent(text);
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
