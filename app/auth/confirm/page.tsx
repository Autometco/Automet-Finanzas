"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { LightningLogo } from "@/components/lightning-logo"

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [showAnimation, setShowAnimation] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const confirmEmail = async () => {
      const supabase = createClient()

      try {
        // Obtener los parámetros de la URL
        const token_hash = searchParams.get("token_hash")
        const type = searchParams.get("type")

        if (token_hash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          })

          if (error) {
            console.error("[v0] Error confirmando email:", error)
            setStatus("error")
            setMessage("Error al confirmar tu email. El enlace puede haber expirado.")
            return
          }

          if (data.user) {
            console.log("[v0] Email confirmado exitosamente:", data.user.email)
            setStatus("success")
            setMessage("¡Tu cuenta ha sido activada exitosamente!")

            setTimeout(() => {
              setShowAnimation(true)
            }, 500)

            setTimeout(() => {
              router.push("/dashboard")
            }, 4000)
          }
        } else {
          setStatus("error")
          setMessage("Enlace de confirmación inválido.")
        }
      } catch (error) {
        console.error("[v0] Error en confirmación:", error)
        setStatus("error")
        setMessage("Error inesperado al confirmar tu email.")
      }
    }

    confirmEmail()
  }, [searchParams, router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-black">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <LightningLogo className="h-8 w-8" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Automet Finanzas
              </span>
            </div>
          </div>

          <Card className="border border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {status === "loading" && <Loader2 className="h-16 w-16 text-blue-400 animate-spin" />}
                {status === "success" && (
                  <div className={`transition-all duration-1000 ${showAnimation ? "scale-110" : "scale-100"}`}>
                    <CheckCircle
                      className={`h-16 w-16 text-green-400 transition-all duration-1000 ${showAnimation ? "drop-shadow-lg" : ""}`}
                    />
                  </div>
                )}
                {status === "error" && <XCircle className="h-16 w-16 text-red-400" />}
              </div>

              <CardTitle className="text-2xl text-white">
                {status === "loading" && "Confirmando tu email..."}
                {status === "success" && "¡Email Confirmado!"}
                {status === "error" && "Error de Confirmación"}
              </CardTitle>

              <CardDescription className="text-base text-gray-300">{message}</CardDescription>
            </CardHeader>

            <CardContent>
              {status === "success" && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-green-400 font-medium">¡Bienvenido a Automet Finanzas!</p>
                    <p className="text-sm text-gray-400">Serás redirigido al dashboard automáticamente...</p>
                  </div>

                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                  >
                    Ir al Dashboard
                  </Button>
                </div>
              )}

              {status === "error" && (
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Volver al Inicio
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
