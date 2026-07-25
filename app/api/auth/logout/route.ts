import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        userName: user.fullName,
        module: "AUTH",
        action: "LOGOUT",
        entityType: "User",
        entityId: user.id,
        summary: `${user.fullName} دەرچوو`,
        req,
      });
    }
  } catch (error) {
    console.error("LOGOUT AUDIT ERROR:", error);
  }

  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
