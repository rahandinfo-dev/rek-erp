import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/pwa/push-server";
import { tServer } from "@/lib/i18n";

/** Public VAPID key only — safe to expose to authenticated clients. */
export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.pushNotConfigured") },
      { status: 503 }
    );
  }
  return NextResponse.json({ success: true, data: { publicKey: key } });
}
