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

    setIsResending(true)
    setResendMessage("")

    try {
      const result = await resendConfirmationEmail(email)

      if (result.success) {
        setResendMessage("¡Email reenviado exitosamente! Revisa tu bandeja de entrada.")
        setCountdown(60)
        setCanResend(false)
      } else {
        setResendMessage(result.error || "Error al reenviar el email")
      }
    } catch (error) {
      setResendMessage("Error de conexión al reenviar el email")
    } finally {
      setIsResending(false)
    }
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
                  <p className="text-sm text-gray-400">
                    ¿No recibiste el email? Podrás reenviar en{" "}
                    <span className="font-semibold text-blue-400">{countdown}s</span>
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleResendEmail}
                      disabled={isResending}
                      variant="outline"
                      className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800"
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
                    {resendMessage && (
                      <p
                        className={`text-sm ${resendMessage.includes("exitosamente") ? "text-green-400" : "text-red-400"}`}
                      >
                        {resendMessage}
                      </p>
                    )}
                  </div>
                )}
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
