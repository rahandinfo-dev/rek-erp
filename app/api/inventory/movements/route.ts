import { NextRequest, NextResponse } from "next/server";
import type { InventoryTransactionType } from "@/lib/prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { queryMovementHistory } from "@/lib/inventory/history";

/** Append-only inventory movement ledger. No DELETE â€” history is permanent. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "ØªÚ©Ø§ÛŒÛ• Ø³Û•Ø±Û•ØªØ§ Ø¨Ú†Û† Ú˜ÙˆÙˆØ±Û•ÙˆÛ•." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const type = (searchParams.get("type") || "") as InventoryTransactionType | "";

    const data = await queryMovementHistory({
      companyId: user.companyId,
      q: searchParams.get("q") || undefined,
      type,
      productId: searchParams.get("productId") || undefined,
      warehouseId: searchParams.get("warehouseId") || undefined,
      userId: searchParams.get("userId") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 25),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET MOVEMENT HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Ù‡Û•ÚµÛ•ÛŒÛ•Ú© Ú•ÙˆÙˆÛŒØ¯Ø§." },
      { status: 500 }
    );
  }
}
