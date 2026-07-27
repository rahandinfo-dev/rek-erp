import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { askAiByIntent } from "@/lib/ai/chat";
import { isPredefinedIntent } from "@/lib/ai/predefined";
import { clientKey, rateLimit, RATE_PRESETS } from "@/lib/security/rate-limit";
import { apiRateLimited } from "@/lib/api/response";
import { monitorError } from "@/lib/production/monitor";

const schema = z.object({
  intent: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const limited = rateLimit(
      clientKey(req, `ai-ask:${user.companyId}:${user.id}`),
      RATE_PRESETS.ai
    );
    if (!limited.ok) return apiRateLimited(limited);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "داواکاری نادروستە." },
        { status: 400 }
      );
    }

    if (!isPredefinedIntent(parsed.data.intent)) {
      return NextResponse.json(
        {
          success: false,
          message: "تەنها پرسیارە پێشوەختەکان ڕێگەپێدراون.",
        },
        { status: 400 }
      );
    }

    const result = await askAiByIntent({
      companyId: user.companyId,
      userId: user.id,
      intent: parsed.data.intent,
      req,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    monitorError("api.ai.ask.post", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
