"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Save } from "lucide-react"

interface BypassRecord {
  id: string
  type: string
  identifier: string
  timestamp: string
  username?: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [bypasses, setBypasses] = useState<BypassRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [webhook, setWebhook] = useState("")
  const [bypassLogWebhook, setBypassLogWebhook] = useState("")
  const [webhookSaved, setWebhookSaved] = useState(false)

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth")
    if (auth === "true") {
      setIsAuthenticated(true)
      fetchWebhook()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "novaflarebypasseronlyadmin!") {
      setIsAuthenticated(true)
      sessionStorage.setItem("admin_auth", "true")
      setError("")
      fetchWebhook()
    } else {
      setError("Invalid password")
    }
  }

  const fetchWebhook = async () => {
    try {
      const response = await fetch("/api/admin/webhook")
      if (response.ok) {
        const data = await response.json()
        setWebhook(data.webhook || "")
        setBypassLogWebhook(data.bypassLogWebhook || "")
      }
    } catch (error) {
      console.error("Failed to fetch webhook:", error)
    }
  }

  const handleSaveWebhook = async () => {
    try {
      const response = await fetch("/api/admin/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook, bypassLogWebhook }),
      })

      if (response.ok) {
        setWebhookSaved(true)
        setTimeout(() => setWebhookSaved(false), 3000)
      }
    } catch (error) {
      console.error("Failed to save webhook:", error)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem("admin_auth")
    setPassword("")
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--dark-bg)" }}>
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
          <canvas
            id="bg-anim-admin"
            style={{
              width: "100%",
              height: "100%",
              background: "radial-gradient(ellipse at top, #1e1033 0%, #0a0514 50%, #000000 100%)",
            }}
          ></canvas>
        </div>
        <Card
          className="w-full max-w-md relative z-10"
          style={{
            background: "rgba(20, 10, 31, 0.9)",
            backdropFilter: "blur(40px)",
            border: "2px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">Admin Access</CardTitle>
            <CardDescription className="text-center" style={{ color: "var(--purple-200)" }}>
              Enter password to access admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    background: "rgba(10, 5, 20, 0.6)",
                    border: "2px solid rgba(168, 85, 247, 0.25)",
                    color: "white",
                  }}
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                style={{ background: "linear-gradient(135deg, var(--purple-600), var(--purple-400))" }}
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--dark-bg)", position: "relative" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
        <canvas
          id="bg-anim-admin"
          style={{
            width: "100%",
            height: "100%",
            background: "radial-gradient(ellipse at top, #1e1033 0%, #0a0514 50%, #000000 100%)",
          }}
        ></canvas>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              style={{ borderColor: "rgba(168, 85, 247, 0.3)", color: "white" }}
            >
              Back to Home
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              style={{ borderColor: "rgba(168, 85, 247, 0.3)", color: "white" }}
            >
              Logout
            </Button>
          </div>
        </div>

        <Card
          className="mb-8"
          style={{
            background: "rgba(20, 10, 31, 0.9)",
            backdropFilter: "blur(40px)",
            border: "2px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8" style={{ color: "var(--purple-400)" }} />
              <CardTitle className="text-2xl text-white">Global Webhook Configuration</CardTitle>
            </div>
            <CardDescription style={{ color: "var(--purple-200)" }}>
              Set the Discord webhook URLs for notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white">Main Webhook (Includes Cookie)</label>
              <div className="flex gap-4">
                <Input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhook}
                  onChange={(e) => setWebhook(e.target.value)}
                  className="flex-1"
                  style={{
                    background: "rgba(10, 5, 20, 0.6)",
                    border: "2px solid rgba(168, 85, 247, 0.25)",
                    color: "white",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white">Bypass-log Webhook (Info Only - No Cookie)</label>
              <div className="flex gap-4">
                <Input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={bypassLogWebhook}
                  onChange={(e) => setBypassLogWebhook(e.target.value)}
                  className="flex-1"
                  style={{
                    background: "rgba(10, 5, 20, 0.6)",
                    border: "2px solid rgba(168, 85, 247, 0.25)",
                    color: "white",
                  }}
                />
              </div>
            </div>

            <Button
              onClick={handleSaveWebhook}
              style={{ background: "linear-gradient(135deg, var(--purple-600), var(--purple-400))", width: "100%" }}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
            {webhookSaved && (
              <p className="text-green-400 text-sm mt-2 text-center">Configuration saved successfully!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
