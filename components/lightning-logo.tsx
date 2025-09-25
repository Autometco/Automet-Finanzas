interface LightningLogoProps {
  className?: string
  size?: number
}

export function LightningLogo({ className = "", size = 40 }: LightningLogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
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

        {/* Enhanced gradients */}
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

      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-md -z-10 animate-pulse" />
    </div>
  )
}
