import { NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";

/**
 * Public liveness/readiness probe for load balancers & monitoring.
 * Does not expose secrets or company data.
 */
export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const body = {
    ok: dbOk,
    service: "rek",
    status: dbOk ? "healthy" : "degraded",
    uptimeSec: Math.floor(process.uptime()),
    durationMs: Date.now() - started,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
