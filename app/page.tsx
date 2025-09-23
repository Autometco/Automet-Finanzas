"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { loginUser, registerUser } from "@/lib/api"
import { useRouter } from "next/navigation"
import { TrendingUp, Shield, Target, Sparkles } from "lucide-react"
import { LightningLogo } from "@/components/lightning-logo"

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    occupation: "",
    monthlyIncome: [1000],
    mainExpenses: [],
  })
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await loginUser(formData.email, formData.password)
      if (result.success) {
        localStorage.setItem("user", JSON.stringify(result.user))
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await registerUser(formData)
      if (result.success) {
        localStorage.setItem("user", JSON.stringify(result.user))
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error al registrarse:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const expenseCategories = [
    { id: "housing", name: "Vivienda", icon: "🏠" },
    { id: "food", name: "Alimentación", icon: "🍔" },
    { id: "transport", name: "Transporte", icon: "🚗" },
    { id: "entertainment", name: "Entretenimiento", icon: "🎬" },
    { id: "health", name: "Salud", icon: "🏥" },
    { id: "education", name: "Educación", icon: "📚" },
  ]

  const toggleExpenseCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      mainExpenses: prev.mainExpenses.includes(categoryId)
        ? prev.mainExpenses.filter((id) => id !== categoryId)
        : [...prev.mainExpenses, categoryId],
    }))
  }

  const getIncomeRange = (value: number) => {
    if (value <= 100) return "$0 - $100"
    if (value <= 500) return "$100 - $500"
    if (value <= 1000) return "$500 - $1,000"
    if (value <= 2000) return "$1,000 - $2,000"
    if (value <= 4000) return "$2,000 - $4,000"
    return "$4,000+"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <LightningLogo size={48} className="text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Automet finanzas
            </h1>
          </div>
          <p className="text-muted-foreground text-balance">
            Gestiona tus finanzas de manera inteligente y alcanza tus metas
          </p>
        </div>

        {step === 1 && (
          <Card className="border-border/50 shadow-2xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl text-foreground">¡Bienvenido!</CardTitle>
              <CardDescription className="text-muted-foreground">
                Comienza tu viaje hacia la libertad financiera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="login" className="text-foreground">
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-foreground">
                    Registrarse
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">
                        Correo electrónico
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground">
                        Contraseña
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={isLoading}
                    >
                      {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      setStep(2)
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-foreground">
                        Correo electrónico
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-foreground">
                        Contraseña
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Continuar
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50 shadow-2xl bg-card/80 backdrop-blur-sm animate-slide-in-right">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                Personaliza tu experiencia
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Cuéntanos sobre ti para brindarte mejores recomendaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  ¿Cómo te llamas?
                </Label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-foreground">
                  ¿A qué te dedicas?
                </Label>
                <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, occupation: value }))}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="Selecciona tu ocupación" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="student">Estudiante</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="entrepreneur">Emprendedor</SelectItem>
                    <SelectItem value="retired">Jubilado</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-foreground">Ingresos mensuales aproximados</Label>
                <div className="px-2">
                  <Slider
                    value={formData.monthlyIncome}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, monthlyIncome: value }))}
                    max={5000}
                    min={0}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span>$0</span>
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                      {getIncomeRange(formData.monthlyIncome[0])}
                    </Badge>
                    <span>$4,000+</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-foreground">Gastos principales (opcional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {expenseCategories.map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={formData.mainExpenses.includes(category.id) ? "default" : "outline"}
                      className={`h-auto p-3 flex flex-col items-center gap-2 transition-all duration-200 hover-lift-subtle ${
                        formData.mainExpenses.includes(category.id)
                          ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                          : "bg-card hover:bg-accent border-border"
                      }`}
                      onClick={() => toggleExpenseCategory(category.id)}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-xs">{category.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-border hover:bg-accent"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleRegister}
                  disabled={isLoading || !formData.name || !formData.occupation}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Seguro</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Metas</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Análisis</p>
          </div>
        </div>
      </div>
    </div>
  )
}
