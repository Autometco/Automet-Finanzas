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
            setMessage("¡Tu email ha sido confirmado exitosamente!")

            // Redireccionar automáticamente después de 3 segundos
            setTimeout(() => {
              router.push("/")
            }, 3000)
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <LightningLogo className="h-8 w-8" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Automet Finanzas
              </span>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {status === "loading" && <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />}
                {status === "success" && <CheckCircle className="h-12 w-12 text-green-600" />}
                {status === "error" && <XCircle className="h-12 w-12 text-red-600" />}
              </div>

              <CardTitle className="text-2xl">
                {status === "loading" && "Confirmando tu email..."}
                {status === "success" && "¡Email Confirmado!"}
                {status === "error" && "Error de Confirmación"}
              </CardTitle>

              <CardDescription className="text-base">{message}</CardDescription>
            </CardHeader>

            <CardContent>
              {status === "success" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Serás redirigido automáticamente en unos segundos...
                  </p>
                  <Button
                    onClick={() => router.push("/")}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Ir al Login
                  </Button>
                </div>
              )}

              {status === "error" && (
                <Button onClick={() => router.push("/")} variant="outline" className="w-full">
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
