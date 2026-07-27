import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tServer } from "@/lib/i18n";
import {
  acknowledgeAlert,
  listOpenAlerts,
  refreshAiAlerts,
} from "@/lib/ai/alerts";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }
    const data = await refreshAiAlerts(user.companyId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("AI ALERTS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["acknowledge"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalid") },
        { status: 400 }
      );
    }
    const ok = await acknowledgeAlert(user.companyId, parsed.data.id);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "نەدۆزرایەوە" },
        { status: 404 }
      );
    }
    const data = await listOpenAlerts(user.companyId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("AI ALERTS PATCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
