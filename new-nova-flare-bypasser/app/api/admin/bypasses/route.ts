export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getHistory } from "@/lib/history"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  const history = await getHistory(limit)

  return NextResponse.json({
    bypasses: history,
  })
}
