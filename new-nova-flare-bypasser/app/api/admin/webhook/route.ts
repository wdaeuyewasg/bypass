import { NextResponse } from "next/server"
import { redis } from "@/lib/history"

export async function GET() {
  try {
    const [webhook, bypassLogWebhook] = await Promise.all([
      redis.get<string>("global_webhook"),
      redis.get<string>("bypass_log_webhook"),
    ])
    return NextResponse.json({
      webhook: webhook || "",
      bypassLogWebhook: bypassLogWebhook || "",
    })
  } catch (error) {
    return NextResponse.json({ webhook: "", bypassLogWebhook: "" })
  }
}

export async function POST(request: Request) {
  try {
    const { webhook, bypassLogWebhook } = await request.json()

    if (webhook !== undefined) {
      if (webhook && !webhook.includes("discord.com/api/webhooks/")) {
        return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 })
      }
      await redis.set("global_webhook", webhook)
    }

    if (bypassLogWebhook !== undefined) {
      if (bypassLogWebhook && !bypassLogWebhook.includes("discord.com/api/webhooks/")) {
        return NextResponse.json({ error: "Invalid bypass log webhook URL" }, { status: 400 })
      }
      await redis.set("bypass_log_webhook", bypassLogWebhook)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save webhook" }, { status: 500 })
  }
}

export async function getGlobalWebhook() {
  try {
    return (await redis.get<string>("global_webhook")) || ""
  } catch {
    return ""
  }
}

export async function getBypassLogWebhook() {
  try {
    return (await redis.get<string>("bypass_log_webhook")) || ""
  } catch {
    return ""
  }
}
