"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { LightningLogo } from "@/components/lightning-logo"
import { useState, useEffect } from "react"
import { resendConfirmationEmail } from "@/lib/api"
import { useSearchParams } from "next/navigation"

export default function Page() {
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendAttempts, setResendAttempts] = useState(0)
  const [lastResendTime, setLastResendTime] = useState<number | null>(null)
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    if (!email) {
      setResendMessage("No se pudo obtener el email para reenviar")
      return
    }

    // Check if we've hit the hourly limit (2 emails per hour)
    const now = Date.now()
    if (lastResendTime && resendAttempts >= 2) {
      const timeSinceLastResend = now - lastResendTime
      const oneHour = 60 * 60 * 1000

      if (timeSinceLastResend < oneHour) {
        const remainingTime = Math.ceil((oneHour - timeSinceLastResend) / (60 * 1000))
        setResendMessage(
          `Has alcanzado el límite de reenvíos (2 por hora). Podrás intentar nuevamente en ${remainingTime} minutos.`,
        )
        return
      } else {
        // Reset attempts after an hour
        setResendAttempts(0)
      }
    }

    setIsResending(true)
    setResendMessage("")

    try {
      const result = await resendConfirmationEmail(email)

      if (result.success) {
        setResendMessage("¡Email reenviado exitosamente! Revisa tu bandeja de entrada y carpeta de spam.")
        setCountdown(60)
        setCanResend(false)
        setResendAttempts((prev) => prev + 1)
        setLastResendTime(now)
      } else {
        // Handle specific Supabase rate limiting errors
        if (result.error?.includes("rate limit") || result.error?.includes("too many requests")) {
          setResendMessage(
            "Has alcanzado el límite de reenvíos. Supabase permite máximo 2 emails por hora. Intenta más tarde.",
          )
        } else if (result.error?.includes("Email rate limit exceeded")) {
          setResendMessage("Límite de emails excedido. Espera unos minutos antes de intentar nuevamente.")
        } else {
          setResendMessage(result.error || "Error al reenviar el email. Intenta más tarde.")
        }
      }
    } catch (error) {
      setResendMessage("Error de conexión al reenviar el email. Verifica tu conexión a internet.")
    } finally {
      setIsResending(false)
    }
  }

  const getRemainingAttempts = () => {
    if (resendAttempts === 0) return "2 reenvíos disponibles"
    if (resendAttempts === 1) return "1 reenvío disponible"
    return "Sin reenvíos disponibles por 1 hora"
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-black">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <LightningLogo className="h-8 w-8" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Automet Finanzas
              </span>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-gray-900 border-gray-800">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Mail className="h-12 w-12 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-white">¡Registro Exitoso!</CardTitle>
              <CardDescription className="text-base text-gray-300">
                Revisa tu email para confirmar tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400 text-center">
                Te hemos enviado un email de confirmación. Haz clic en el enlace del email para activar tu cuenta y
                comenzar a usar Automet Finanzas.
              </p>

              <div className="text-center space-y-3">
                {!canResend ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">
                      ¿No recibiste el email? Podrás reenviar en{" "}
                      <span className="font-semibold text-blue-400">{countdown}s</span>
                    </p>
                    <p className="text-xs text-gray-500">{getRemainingAttempts()}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleResendEmail}
                      disabled={
                        isResending ||
                        (resendAttempts >= 2 && lastResendTime && Date.now() - lastResendTime < 60 * 60 * 1000)
                      }
                      variant="outline"
                      className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Reenviando...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Reenviar Email
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500">{getRemainingAttempts()}</p>

                    {resendMessage && (
                      <div className="space-y-1">
                        <p
                          className={`text-sm ${resendMessage.includes("exitosamente") ? "text-green-400" : "text-red-400"}`}
                        >
                          {resendMessage}
                        </p>
                        {resendMessage.includes("exitosamente") && (
                          <p className="text-xs text-gray-500">
                            Si no lo encuentras, revisa tu carpeta de spam o correo no deseado.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-400">💡 Consejos:</p>
                  <p>• Revisa tu carpeta de spam o correo no deseado</p>
                  <p>• Asegúrate de que el email sea correcto: {email}</p>
                  <p>• Los emails pueden tardar hasta 5 minutos en llegar</p>
                </div>
              </div>

              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
