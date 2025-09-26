"use client"

import { useEffect, useState } from "react"

interface LightningLoadingProps {
  message?: string
  className?: string
}

export function LightningLoading({ message = "Cargando...", className = "" }: LightningLoadingProps) {
  const [lightningPosition, setLightningPosition] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLightningPosition((prev) => (prev + 1) % 100)
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center ${className}`}>
      <div className="text-center space-y-6">
        <div className="relative w-80 h-20 mx-auto overflow-hidden">
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
            style={{ left: `${lightningPosition}%` }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-lightning-glow"
            >
              <path
                d="M20 2L12 18H18L16 38L28 22H22L20 2Z"
                fill="url(#lightning-gradient)"
                stroke="url(#lightning-stroke)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="lightning-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#16a34a" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
            {/* Lightning trail effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent w-20 h-1 top-1/2 -translate-y-1/2 -left-10 blur-sm"></div>
          </div>

          {/* Background track */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-muted to-transparent"></div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{message}</h2>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
