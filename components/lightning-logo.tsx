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
        {/* Rayo principal */}
        <path
          d="M20 2L12 18H18L16 38L28 22H22L20 2Z"
          fill="url(#lightning-gradient)"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Gradiente para el rayo */}
        <defs>
          <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#65ff95" />
            <stop offset="50%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#0099ff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Efecto de brillo adicional */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg blur-sm -z-10" />
    </div>
  )
}
