import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/pwa/push-server";

/** Public VAPID key only — safe to expose to authenticated clients. */
export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { success: false, message: "Push is not configured." },
      { status: 503 }
    );
  }
  return NextResponse.json({ success: true, data: { publicKey: key } });
}
