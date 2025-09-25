"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { loginUser, registerUser, getCategories } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Zap, ArrowRight, Check, AlertCircle } from "lucide-react"

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [error, setError] = useState("")
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  })
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const result = await loginUser(formData)
      if (result.success) {
        router.push("/dashboard")
      } else {
        setError(result.error || "Error al iniciar sesión")
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const result = await registerUser({ ...formData, categories: selectedCategories })
      if (result.success) {
        if (result.needsEmailConfirmation) {
          router.push(`/auth/sign-up-success?email=${encodeURIComponent(formData.email)}`)
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(result.error || "Error al registrar usuario")
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error)
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getCategories()
        setCategories(result.categories)
      } catch (error) {
        console.error("Error al cargar categorías:", error)
      }
    }
    loadCategories()
  }, [])

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Zap className="w-7 h-7 text-primary animate-lightning-glow" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  <span className="text-primary">Automet</span> <span className="text-foreground">Finanzas</span>
                </h1>
                <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-secondary mx-auto mt-2"></div>
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">
              Tu asistente inteligente para el control financiero personal
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
              {!isLogin && step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Tu nombre"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="bg-input border-border"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Tu apellido"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="bg-input border-border"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-input border-border"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contraseña"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-input border-border pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {!isLogin && step === 2 && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Selecciona tus categorías</h3>
                    <p className="text-sm text-muted-foreground">Opcional: Elige las categorías que más uses</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                          selectedCategories.includes(category.id)
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <span className="text-sm font-medium">{category.name}</span>
                          {selectedCategories.includes(category.id) && (
                            <Check className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Atrás
                    </Button>
                    <Button type="button" onClick={() => setStep(3)} className="flex-1">
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-input border-border"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contraseña"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-input border-border pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {(isLogin || (!isLogin && step === 1)) && (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading
                    ? isLogin
                      ? "Iniciando sesión..."
                      : "Continuando..."
                    : isLogin
                      ? "Iniciar Sesión"
                      : "Continuar"}
                  {!isLogin && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}

              {!isLogin && step === 3 && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">¡Listo para comenzar!</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategories.length > 0
                        ? `Has seleccionado ${selectedCategories.length} categorías`
                        : "Puedes agregar categorías más tarde"}
                    </p>
                  </div>

                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {categories
                        .filter((cat) => selectedCategories.includes(cat.id))
                        .map((category) => (
                          <Badge key={category.id} variant="secondary" className="text-xs">
                            {category.icon} {category.name}
                          </Badge>
                        ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Atrás
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90">
                      {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setStep(1)
                    setSelectedCategories([])
                    setError("")
                  }}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  {isLogin ? "Regístrate" : "Inicia sesión"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
