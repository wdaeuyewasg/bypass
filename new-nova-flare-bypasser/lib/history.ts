import { Redis } from "@upstash/redis"

const redisUrl = process.env.KV_REST_API_URL || process.env.KV_REST_API_URL
const redisToken = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN

export const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null

export interface BypassRecord {
  id: string
  type: string
  identifier: string
  timestamp: string
  username?: string
}

const HISTORY_KEY = "bypass_history"

export async function addToHistory(record: Omit<BypassRecord, "id" | "timestamp">) {
  if (!redis) {
    console.warn("Redis not configured, skipping history add")
    return null
  }

  const newRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...record,
  }

  try {
    // Push to left of list
    await redis.lpush(HISTORY_KEY, JSON.stringify(newRecord))
    // Trim to keep only last 50
    await redis.ltrim(HISTORY_KEY, 0, 49)
  } catch (error) {
    console.error("Failed to add to history:", error)
  }

  return newRecord
}

export async function getHistory(limit = 50) {
  if (!redis) {
    console.warn("Redis not configured, returning empty history")
    return []
  }

  try {
    // Get range 0 to limit-1
    const history = await redis.lrange(HISTORY_KEY, 0, limit - 1)
    return history
      .map((item) => {
        try {
          return typeof item === "string" ? JSON.parse(item) : item
        } catch (e) {
          return null
        }
      })
      .filter(Boolean)
  } catch (error) {
    console.error("Failed to get history:", error)
    return []
  }
}
