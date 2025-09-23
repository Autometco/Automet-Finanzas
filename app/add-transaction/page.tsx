"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addTransaction } from "@/lib/api"
import { ArrowLeft, Plus, Minus, Calendar, DollarSign, Target } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AddTransaction() {
  const [transactionType, setTransactionType] = useState("expense")
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [goalNotification, setGoalNotification] = useState(null)
  const router = useRouter()

  const categories = [
    { id: "Alimentación", name: "Alimentación", icon: "🍔", color: "#22c55e" },
    { id: "Transporte", name: "Transporte", icon: "🚗", color: "#3b82f6" },
    { id: "Entretenimiento", name: "Entretenimiento", icon: "🎬", color: "#f59e0b" },
    { id: "Servicios", name: "Servicios", icon: "💡", color: "#ef4444" },
    { id: "Salud", name: "Salud", icon: "🏥", color: "#8b5cf6" },
    { id: "Educación", name: "Educación", icon: "📚", color: "#06b6d4" },
    { id: "Ropa", name: "Ropa", icon: "👕", color: "#ec4899" },
    { id: "Hogar", name: "Hogar", icon: "🏠", color: "#84cc16" },
  ]

  const incomeCategories = [
    { id: "Salario", name: "Salario", icon: "💼", color: "#22c55e" },
    { id: "Freelance", name: "Freelance", icon: "💻", color: "#3b82f6" },
    { id: "Inversiones", name: "Inversiones", icon: "📈", color: "#f59e0b" },
    { id: "Bonificación", name: "Bonificación", icon: "🎁", color: "#8b5cf6" },
    { id: "Otros", name: "Otros", icon: "💰", color: "#06b6d4" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const transactionData = {
        ...formData,
        amount:
          transactionType === "expense" ? -Number.parseFloat(formData.amount) : Number.parseFloat(formData.amount),
        type: transactionType,
      }

      const result = await addTransaction(transactionData)
      if (result.success) {
        if (result.goalUpdated) {
          setGoalNotification(result.goalUpdated)
          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error) {
      console.error("Error al agregar transacción:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentCategories = transactionType === "expense" ? categories : incomeCategories

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="hover-lift-subtle">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Agregar Movimiento</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {goalNotification && (
          <Card className="border-0 shadow-xl bg-primary/10 border-l-4 border-l-primary animate-fade-in-up">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-primary">¡Meta de ahorro actualizada!</h4>
                  <p className="text-xs text-muted-foreground">
                    {goalNotification.type === "income" ? "Depositado" : "Retirado"} $
                    {goalNotification.amount.toLocaleString()} {goalNotification.type === "income" ? "en" : "de"} "
                    {goalNotification.name}". Nuevo total: ${goalNotification.newCurrent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-xl animate-fade-in-up hover-lift">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Nuevo Movimiento
            </CardTitle>
            <CardDescription>Registra tus ingresos y gastos de manera rápida</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Transaction Type */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant={transactionType === "expense" ? "default" : "outline"}
                className="flex-1 h-12 hover-lift-subtle"
                onClick={() => setTransactionType("expense")}
              >
                <Minus className="w-4 h-4 mr-2" />
                Gasto
              </Button>
              <Button
                type="button"
                variant={transactionType === "income" ? "default" : "outline"}
                className="flex-1 h-12 hover-lift-subtle"
                onClick={() => setTransactionType("income")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ingreso
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    className="pl-10 text-lg h-12"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="¿En qué gastaste o de dónde viene este dinero?"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  💡 Si el nombre coincide exactamente con una meta de ahorro, el monto se{" "}
                  {transactionType === "income" ? "depositará" : "restará"} automáticamente
                </p>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    className="pl-10"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <Label>Categoría</Label>
                <div className="grid grid-cols-2 gap-3">
                  {currentCategories.map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={formData.category === category.id ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-center gap-2 relative hover-lift-subtle"
                      onClick={() => setFormData((prev) => ({ ...prev, category: category.id }))}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                      {formData.category === category.id && (
                        <div
                          className="absolute inset-0 rounded-md border-2 pointer-events-none"
                          style={{ borderColor: category.color }}
                        ></div>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-lg hover-lift-subtle"
                disabled={isLoading || !formData.amount || !formData.description || !formData.category}
              >
                {isLoading ? "Guardando..." : `Agregar ${transactionType === "expense" ? "Gasto" : "Ingreso"}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card
          className="border-0 shadow-lg bg-primary/5 animate-fade-in-up hover-lift"
          style={{ animationDelay: "0.2s" }}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">💡</span>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Consejo rápido</h4>
                <p className="text-xs text-muted-foreground">
                  Registra tus movimientos inmediatamente para mantener un control preciso de tus finanzas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
