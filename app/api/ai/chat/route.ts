import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listMessages } from "@/lib/ai/chat";
import { clientKey, rateLimit, RATE_PRESETS } from "@/lib/security/rate-limit";
import { apiRateLimited } from "@/lib/api/response";
import { monitorError } from "@/lib/production/monitor";

const schema = z.object({
  message: z.string().min(1).max(500),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }
    const data = await listMessages(user.companyId, user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    monitorError("api.ai.chat.get", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

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
      clientKey(req, `ai:${user.companyId}:${user.id}`),
      RATE_PRESETS.ai
    );
    if (!limited.ok) return apiRateLimited(limited);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "پەیام نادروستە." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "تەنها پرسیارە پێشوەختەکان ڕێگەپێدراون. لە لاپەڕەی یاریدەدەری زیرەک کارتی پرسیار هەڵبژێرە.",
      },
      { status: 403 }
    );
  } catch (error) {
    monitorError("api.ai.chat.post", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
