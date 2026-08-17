import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSubscriptionEntitlement } from "@/lib/subscriptions/service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  const entitlement = await getSubscriptionEntitlement(user.companyId);
  return NextResponse.json({ success: true, data: entitlement });
}
