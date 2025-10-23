"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getDashboardData,
  addSavingsGoal,
  depositToSavingsGoal,
  getMotivationalStats,
  startNewMonth,
  getMonthlyHistory,
  deleteSavingsGoal,
} from "@/lib/api"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
} from "recharts"
import {
  Plus,
  Target,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  CreditCard,
  Wallet,
  LogOut,
  BarChart3,
  TrendingUp,
  Calendar,
  Zap,
  PiggyBank,
  X,
} from "lucide-react"
import Link from "next/link"
import { LightningLogo } from "@/components/lightning-logo"
import { LightningLoading } from "@/components/lightning-loading"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const ConfettiAnimation = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
    }, 3000) // Duración de la animación

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"][Math.floor(Math.random() * 5)],
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(false)
  const [newGoal, setNewGoal] = useState({ name: "", target: "", color: "#22c55e", targetDate: "" })
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [chartView, setChartView] = useState("pie")
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [depositSource, setDepositSource] = useState("")
  const [motivationalStats, setMotivationalStats] = useState(null)
  const [monthlyHistory, setMonthlyHistory] = useState([])
  const [isNewMonthDialogOpen, setIsNewMonthDialogOpen] = useState(false)
  const [showHighExpenseAlert, setShowHighExpenseAlert] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [completedGoalName, setCompletedGoalName] = useState("")
  const [completedGoals, setCompletedGoals] = useState(new Set())
  const [gastos, setGastos] = useState([])
  const [gastosLoading, setGastosLoading] = useState(true)
  const [gastosError, setGastosError] = useState(null)
  const router = useRouter()

  const fetchGastos = async () => {
    try {
      setGastosLoading(true)
      setGastosError(null)

      // Simular carga exitosa sin API externa
      setGastos([]) // Array vacío como fallback
      console.log("[v0] Gastos locales cargados exitosamente")
    } catch (err) {
      setGastosError(null) // No mostrar error ya que no es crítico
      console.log("[v0] API externa no disponible, usando datos locales")
      setGastos([]) // Usar array vacío como fallback
    } finally {
      setGastosLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser()

        if (!supabaseUser) {
          console.log("[v0] No hay usuario autenticado, redirigiendo al login")
          setAuthError(true)
          setTimeout(() => {
            router.push("/")
          }, 1500) // Give time for the loading animation to show
          return
        }

        console.log("[v0] Usuario autenticado:", supabaseUser.email)

        const { data: profile } = await supabase.from("profiles").select("name").eq("id", supabaseUser.id).single()

        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "Usuario",
        })

        const result = await getDashboardData()

        if (result.error) {
          console.error("[v0] Error cargando dashboard:", result.error)
          // If there's an authentication error, redirect to login
          if (result.error.includes("autenticado")) {
            setAuthError(true)
            setTimeout(() => {
              router.push("/")
            }, 1500)
            return
          }
        } else {
          setData(result)
        }

        const stats = await getMotivationalStats()
        setMotivationalStats(stats)

        const history = await getMonthlyHistory()
        setMonthlyHistory(history)

        if (result?.summary?.income && result.summary.income > 0) {
          const expensePercentage = (result.summary.expenses / result.summary.income) * 100
          if (expensePercentage > 50) {
            setShowHighExpenseAlert(true)
          }
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
        setAuthError(true)
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  useEffect(() => {
    fetchGastos()
  }, [])

  const handleAddGoal = async () => {
    if (newGoal.name && newGoal.target) {
      try {
        console.log("[v0] Creating goal with data:", newGoal)
        const result = await addSavingsGoal({
          name: newGoal.name,
          target: Number.parseFloat(newGoal.target), // Use parseFloat for decimal amounts
          color: newGoal.color,
          targetDate: newGoal.targetDate || null,
        })

        if (result.success) {
          setData((prev) => ({
            ...prev,
            savingsGoals: [...prev.savingsGoals, result.goal],
          }))
          setNewGoal({ name: "", target: "", color: "#22c55e", targetDate: "" })
          setIsAddingGoal(false)
        } else {
          console.error("[v0] Error creating goal:", result.error)
        }
      } catch (error) {
        console.error("[v0] Error al agregar meta:", error)
      }
    }
  }

  const handleDeposit = async () => {
    if (selectedGoalId && depositAmount && depositSource) {
      try {
        const result = await depositToSavingsGoal(
          selectedGoalId, // Keep as string UUID
          Number.parseFloat(depositAmount), // Use parseFloat for decimal amounts
          depositSource,
        )

        if (result.success) {
          const updatedGoal = result.goal
          const isCompleted = updatedGoal.current_amount >= updatedGoal.target_amount
          const wasAlreadyCompleted = completedGoals.has(updatedGoal.id)

          setData((prev) => ({
            ...prev,
            savingsGoals: prev.savingsGoals.map(
              (goal) => (goal.id === selectedGoalId ? result.goal : goal), // Compare UUIDs directly as strings
            ),
          }))

          if (depositSource === "ingreso") {
            setData((prev) => ({
              ...prev,
              summary: {
                ...prev.summary,
                expenses: prev.summary.expenses + Number.parseFloat(depositAmount),
                balance: prev.summary.balance - Number.parseFloat(depositAmount),
              },
            }))
          }

          if (isCompleted && !wasAlreadyCompleted) {
            setCompletedGoalName(updatedGoal.name)
            setShowConfetti(true)
            setCompletedGoals((prev) => new Set([...prev, updatedGoal.id]))
          }

          setSelectedGoalId("")
          setDepositAmount("")
          setDepositSource("")
          setIsDepositDialogOpen(false)

          const stats = await getMotivationalStats()
          setMotivationalStats(stats)
        }
      } catch (error) {
        console.error("Error al depositar:", error)
      }
    }
  }

  const handleNewMonth = async () => {
    try {
      const result = await startNewMonth()
      if (result.success) {
        const newData = await getDashboardData()
        setData(newData)

        const history = await getMonthlyHistory()
        setMonthlyHistory(history)

        const stats = await getMotivationalStats()
        setMotivationalStats(stats)

        setIsNewMonthDialogOpen(false)
      }
    } catch (error) {
      console.error("Error al iniciar nuevo mes:", error)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem("user")
    localStorage.removeItem("transactions")
    localStorage.removeItem("savingsGoals")
    router.push("/")
  }

  const handleConfettiComplete = () => {
    // Solo detener la animación de confeti, no cerrar el mensaje
    // El mensaje se cerrará manualmente con el botón X
  }

  const handleCloseCongratulations = () => {
    setShowConfetti(false)
    // Remover la meta completada cuando el usuario cierre el mensaje
    setData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter((goal) => goal.current_amount < goal.target_amount),
    }))
  }

  const handleDeleteSavingsGoal = async (goalId) => {
    try {
      await deleteSavingsGoal(goalId)
      // Refrescar datos
      const newData = await getDashboardData()
      setData(newData)
    } catch (error) {
      console.error("Error al eliminar meta:", error)
    }
  }

  const [loadingTimeout, setLoadingTimeout] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingTimeout(true)
    }, 500)

    return () => clearTimeout(timeout)
  }, [])

  if (authError) {
    return <LightningLoading message="Verificando acceso..." />
  }

  if (loading && gastosLoading && !loadingTimeout) {
    return <LightningLoading message="Cargando tu dashboard" />
  }

  if (loadingTimeout || (!loading && !gastosLoading)) {
    if (!data) {
      return <LightningLoading message="Preparando tus datos..." />
    }

    const { summary, categories, recentTransactions, savingsGoals } = data

    const hasTransactions = recentTransactions && recentTransactions.length > 0
    const hasCategories = categories && categories.length > 0
    const hasSavingsGoals = savingsGoals && savingsGoals.length > 0

    return (
      <div className="min-h-screen bg-background">
        {showConfetti && (
          <>
            <ConfettiAnimation onComplete={handleConfettiComplete} />
            {/* Adding glassmorphism to congratulations modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto bg-black/50 backdrop-blur-sm">
              <div className="glass-card p-8 text-center shadow-2xl animate-scale-in relative max-w-md mx-4 rounded-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseCongratulations}
                  className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-muted micro-bounce"
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="text-6xl mb-4 animate-float">🎉</div>
                <h2 className="text-2xl font-bold text-primary mb-2 animate-glow-pulse">¡Felicitaciones!</h2>
                <p className="text-lg text-foreground">
                  Has completado tu meta: <span className="font-semibold text-success">{completedGoalName}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">¡Sigue así con tus objetivos financieros!</p>
              </div>
            </div>
          </>
        )}

        {showHighExpenseAlert && (
          <div className="fixed bottom-4 left-4 z-50 max-w-sm">
            {/* Adding glassmorphism to alert */}
            <div className="glass-card bg-destructive/20 text-destructive-foreground p-4 rounded-lg shadow-lg border border-destructive/30 animate-fade-in-up">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">¡Atención con tus gastos!</p>
                    <p className="text-xs opacity-90 mt-1">
                      Estás destinando más de la mitad de tus ingresos en gastos. Intenta reducir esa cantidad para el
                      próximo mes y mejorar tu ahorro.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHighExpenseAlert(false)}
                  className="h-6 w-6 p-0 hover:bg-destructive-foreground/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/10 sticky top-0 z-10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              {/* Logo and greeting section */}
              <div className="flex items-center space-x-4">
                <LightningLogo size={40} className="text-primary animate-lightning-glow" />
                <div className="flex flex-col">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                    <span className="text-primary">Automet</span> <span className="text-foreground">Finanzas</span>
                  </h1>
                  <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-secondary"></div>
                  {user?.name && <p className="text-sm text-muted-foreground mt-1 font-medium">Hola, {user.name}</p>}
                </div>
              </div>

              {/* Action buttons - redesigned for mobile */}
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                {/* Primary action button - full width on mobile */}
                <Link href="/add-transaction" className="w-full md:w-auto">
                  <Button className="animate-pulse-success hover-lift-subtle w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Transacción
                  </Button>
                </Link>

                {/* Secondary actions - side by side on mobile */}
                <div className="flex space-x-2">
                  <Dialog open={isNewMonthDialogOpen} onOpenChange={setIsNewMonthDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="hover-lift-subtle bg-transparent flex-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        Nuevo Mes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Iniciar Nuevo Mes</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Esto guardará las estadísticas del mes actual y limpiará las transacciones para empezar de
                          nuevo.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsNewMonthDialogOpen(false)} className="flex-1">
                          Cancelar
                        </Button>
                        <Button onClick={handleNewMonth} className="flex-1">
                          Confirmar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={handleLogout} className="hover-lift-subtle bg-transparent flex-1">
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-success hover-lift smooth-transition overflow-hidden">
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ingresos del Mes</p>
                    <p className="text-2xl font-bold text-success">${(summary?.income || 0).toLocaleString()}</p>
                    {(summary?.income || 0) === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Agrega tu primer ingreso</p>
                    )}
                  </div>
                  <div className="w-12 h-12 neuro-inset rounded-full flex items-center justify-center liquid-glow">
                    <DollarSign className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-danger hover-lift smooth-transition overflow-hidden"
              style={{ animationDelay: "0.1s" }}
            >
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gastos del Mes</p>
                    <p className="text-2xl font-bold text-destructive">${(summary?.expenses || 0).toLocaleString()}</p>
                    {(summary?.expenses || 0) === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Registra tus gastos</p>
                    )}
                  </div>
                  <div className="w-12 h-12 neuro-inset rounded-full flex items-center justify-center liquid-glow">
                    <CreditCard className="w-6 h-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-primary hover-lift smooth-transition overflow-hidden"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Balance/Ahorro</p>
                    <p
                      className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      ${(summary?.balance || 0).toLocaleString()}
                    </p>
                    {(summary?.balance || 0) === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Tu balance aparecerá aquí</p>
                    )}
                  </div>
                  <div className="w-12 h-12 neuro-inset rounded-full flex items-center justify-center liquid-glow">
                    <Wallet className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {motivationalStats && hasTransactions && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-success hover-lift smooth-transition overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <TrendingUp className="w-5 h-5" />
                    Porcentaje de Ahorro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-success">{motivationalStats?.savingsPercentage || 0}%</p>
                    <p className="text-sm text-muted-foreground">de tus ingresos este mes</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-primary hover-lift smooth-transition overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Zap className="w-5 h-5" />
                    Proyección Anual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      ${(motivationalStats?.yearEndProjection || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">si sigues así todo el año</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-warning hover-lift smooth-transition overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <Target className="w-5 h-5" />
                    Progreso de Metas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-warning">{motivationalStats?.goalsProgress || 0}%</p>
                    <p className="text-sm text-muted-foreground">de tus objetivos completados</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Chart */}
            <Card
              className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-primary hover-lift smooth-transition overflow-hidden"
              style={{ animationDelay: "0.3s" }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse"></div>
                      Distribución de Gastos
                    </CardTitle>
                    <CardDescription>Gastos por categoría este mes</CardDescription>
                  </div>
                  {hasCategories && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChartView(chartView === "pie" ? "bar" : "pie")}
                      className="hover-lift-subtle"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {chartView === "pie" ? "Ver barras" : "Ver circular"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasCategories ? (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartView === "pie" ? (
                          <PieChart>
                            <Pie
                              data={categories}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="spent"
                              nameKey="name"
                            >
                              {categories.map((entry, index) => {
                                console.log("[v0] Category fill:", entry.name, entry.fill)
                                return <Cell key={`cell-${index}`} fill={entry.fill} />
                              })}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [`$${(value || 0).toLocaleString()}`, "Gastado"]}
                              labelFormatter={(label) => {
                                const category = categories.find((c) => c.name === label)
                                return category ? category.name : label
                              }}
                            />
                            <Legend />
                          </PieChart>
                        ) : (
                          <BarChart data={categories} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => [`$${(value || 0).toLocaleString()}`, "Gastado"]} />
                            <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                              {categories.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {categories.slice(0, 8).map((category) => (
                        <div key={category.id} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="text-xs text-muted-foreground truncate">{category.name}</span>
                          <span className="text-xs font-medium ml-auto">${(category.spent || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">No hay gastos registrados</p>
                      <p className="text-sm text-muted-foreground">Agrega tu primera transacción para ver el gráfico</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card
              className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-secondary hover-lift smooth-transition overflow-hidden"
              style={{ animationDelay: "0.4s" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-glow-pulse"></div>
                  Movimientos Recientes
                </CardTitle>
                <CardDescription>Últimas transacciones</CardDescription>
              </CardHeader>
              <CardContent>
                {hasTransactions ? (
                  <div className="space-y-3">
                    {recentTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        /* Enhanced neumorphism with liquid glow effect */
                        className="flex items-center justify-between p-3 rounded-lg neuro-inset hover:neuro-card smooth-transition hover-lift-subtle micro-bounce liquid-glow-subtle"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                              transaction.type === "income"
                                ? "bg-success/20 text-success"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {transaction.type === "income" ? "↗" : "↙"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">{transaction.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium text-sm ${
                              transaction.type === "income" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : ""}$
                            {Math.abs(transaction.amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{transaction.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-3 py-8">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">No hay movimientos</p>
                      <p className="text-sm text-muted-foreground">Tus transacciones aparecerán aquí</p>
                    </div>
                    <Link href="/add-transaction">
                      <Button size="sm" className="mt-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar primera transacción
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Savings Goals */}
          <Card
            className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-success hover-lift smooth-transition overflow-hidden"
            style={{ animationDelay: "0.5s" }}
          >
            <CardHeader>
              <div className="space-y-4 md:space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary animate-glow-pulse" />
                    Metas de Ahorro
                  </CardTitle>
                  <CardDescription>Tu progreso hacia tus objetivos financieros</CardDescription>
                </div>

                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                    <DialogTrigger asChild>
                      {/* Adding glass button effect */}
                      <Button variant="outline" className="glass-button w-full sm:w-auto micro-bounce bg-transparent">
                        <PiggyBank className="w-4 h-4 mr-2" />
                        Depósito de Ahorro
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border/50">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Depositar en Meta de Ahorro</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Selecciona una meta, el origen del dinero y el monto a depositar
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="goal-select" className="text-foreground">
                            Seleccionar Meta
                          </Label>
                          {hasSavingsGoals ? (
                            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                              <SelectTrigger className="bg-input border-border text-foreground">
                                <SelectValue placeholder="Selecciona una meta de ahorro" />
                              </SelectTrigger>
                              <SelectContent>
                                {savingsGoals.map((goal) => (
                                  <SelectItem key={goal.id} value={goal.id.toString()}>
                                    {goal.name} (${(goal.current_amount || 0).toLocaleString()} / $
                                    {(goal.target_amount || 0).toLocaleString()})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
                              No tienes metas de ahorro aún
                            </p>
                          )}
                        </div>
                        {hasSavingsGoals && (
                          <div className="space-y-2">
                            <Label htmlFor="deposit-source" className="text-foreground">
                              ¿De dónde sale el dinero?
                            </Label>
                            <Select value={depositSource} onValueChange={setDepositSource}>
                              <SelectTrigger className="bg-input border-border text-foreground">
                                <SelectValue placeholder="Selecciona el origen del dinero" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ahorros">De mis ahorros</SelectItem>
                                <SelectItem value="ingreso">De mi ingreso actual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {hasSavingsGoals && (
                          <div className="space-y-2">
                            <Label htmlFor="deposit-amount" className="text-foreground">
                              Monto a Depositar
                            </Label>
                            <Input
                              id="deposit-amount"
                              type="number"
                              placeholder="5000"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              className="bg-input border-border text-foreground"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)} className="flex-1">
                            Cancelar
                          </Button>
                          {hasSavingsGoals && (
                            <Button
                              onClick={handleDeposit}
                              className="flex-1"
                              disabled={!selectedGoalId || !depositAmount || !depositSource}
                            >
                              Depositar en Meta
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
                    <DialogTrigger asChild>
                      {/* Adding glass button effect with gradient */}
                      <Button className="gradient-animate w-full sm:w-auto micro-bounce">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Meta
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border/50">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Agregar Nueva Meta de Ahorro</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Define una nueva meta financiera para alcanzar tus objetivos
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="goal-name" className="text-foreground">
                            Nombre de la meta
                          </Label>
                          <Input
                            id="goal-name"
                            placeholder="Ej: Vacaciones, Auto nuevo, etc."
                            value={newGoal.name}
                            onChange={(e) => setNewGoal((prev) => ({ ...prev, name: e.target.value }))}
                            className="bg-input border-border text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="goal-target" className="text-foreground">
                            Monto objetivo
                          </Label>
                          <Input
                            id="goal-target"
                            type="number"
                            placeholder="50000"
                            value={newGoal.target}
                            onChange={(e) => setNewGoal((prev) => ({ ...prev, target: e.target.value }))}
                            className="bg-input border-border text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="goal-target-date" className="text-foreground">
                            Fecha objetivo (opcional)
                          </Label>
                          <Input
                            id="goal-target-date"
                            type="date"
                            value={newGoal.targetDate}
                            onChange={(e) => setNewGoal((prev) => ({ ...prev, targetDate: e.target.value }))}
                            className="bg-input border-border text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="goal-color" className="text-foreground">
                            Color
                          </Label>
                          <div className="flex gap-2">
                            {["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"].map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`w-8 h-8 rounded-full border-2 hover-lift-subtle ${newGoal.color === color ? "border-foreground" : "border-transparent"}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewGoal((prev) => ({ ...prev, color }))}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsAddingGoal(false)} className="flex-1">
                            Cancelar
                          </Button>
                          <Button onClick={handleAddGoal} className="flex-1">
                            Crear Meta
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasSavingsGoals ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savingsGoals.map((goal) => {
                    const progress = ((goal.current_amount || 0) / (goal.target_amount || 1)) * 100
                    return (
                      <div
                        key={goal.id}
                        /* Enhanced neumorphism with liquid glass border */
                        className="space-y-3 neuro-card p-4 rounded-lg relative group smooth-transition hover-lift liquid-glass-border"
                        style={{ borderColor: goal.color }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSavingsGoal(goal.id)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <div className="flex items-center justify-between pr-8">
                          <h4 className="font-medium text-sm sm:text-base truncate">{goal.name}</h4>
                          <Badge variant="secondary" style={{ backgroundColor: `${goal.color}20`, color: goal.color }}>
                            {Math.round(progress)}%
                          </Badge>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>${(goal.current_amount || 0).toLocaleString()}</span>
                          <span>${(goal.target_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3 py-8">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                    <Target className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">No tienes metas de ahorro</p>
                    <p className="text-sm text-muted-foreground">Crea tu primera meta para empezar a ahorrar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {monthlyHistory.length > 0 && (
            /* Applying liquid glass effect to monthly history card */
            <Card
              className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-primary hover-lift smooth-transition overflow-hidden"
              style={{ animationDelay: "0.5s" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Historial Mensual
                </CardTitle>
                <CardDescription>Comparación de meses anteriores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyHistory.slice(-6)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const months = [
                            "Ene",
                            "Feb",
                            "Mar",
                            "Abr",
                            "May",
                            "Jun",
                            "Jul",
                            "Ago",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dic",
                          ]
                          return months[value]
                        }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          `$${(value || 0).toLocaleString()}`,
                          name === "income" ? "Ingresos" : name === "expenses" ? "Gastos" : "Ahorros",
                        ]}
                        labelFormatter={(value) => {
                          const months = [
                            "Enero",
                            "Febrero",
                            "Marzo",
                            "Abril",
                            "Mayo",
                            "Junio",
                            "Julio",
                            "Agosto",
                            "Septiembre",
                            "Octubre",
                            "Noviembre",
                            "Diciembre",
                          ]
                          return months[value]
                        }}
                      />
                      <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="income" />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="expenses" />
                      <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} name="savings" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-warning hover-lift smooth-transition overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary animate-glow-pulse" />
                Objetivos Financieros
              </CardTitle>
              <CardDescription>Metas y recomendaciones para mejorar tus finanzas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg neuro-card border-l-4 border-l-success smooth-transition hover-lift-subtle liquid-glow-subtle">
                  <h4 className="font-medium text-success mb-2">🎯 Meta de Ahorro</h4>
                  <p className="text-sm text-muted-foreground">
                    Intenta ahorrar al menos el 20% de tus ingresos mensuales para construir un fondo de emergencia
                    sólido.
                  </p>
                </div>
                <div className="p-4 rounded-lg neuro-card border-l-4 border-l-primary smooth-transition hover-lift-subtle liquid-glow-subtle">
                  <h4 className="font-medium text-primary mb-2">📊 Control de Gastos</h4>
                  <p className="text-sm text-muted-foreground">
                    Mantén tus gastos fijos por debajo del 50% de tus ingresos para tener flexibilidad financiera.
                  </p>
                </div>
                <div className="p-4 rounded-lg neuro-card border-l-4 border-l-warning smooth-transition hover-lift-subtle liquid-glow-subtle">
                  <h4 className="font-medium text-warning mb-2">💰 Fondo de Emergencia</h4>
                  <p className="text-sm text-muted-foreground">
                    Construye un fondo que cubra 3-6 meses de gastos esenciales para estar preparado ante imprevistos.
                  </p>
                </div>
                <div className="p-4 rounded-lg neuro-card border-l-4 border-l-secondary smooth-transition hover-lift-subtle liquid-glow-subtle">
                  <h4 className="font-medium text-secondary mb-2">📈 Inversión</h4>
                  <p className="text-sm text-muted-foreground">
                    Una vez tengas tu fondo de emergencia, considera invertir para hacer crecer tu dinero a largo plazo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasTransactions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-warning hover-lift smooth-transition overflow-hidden"
                style={{ animationDelay: "0.6s" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-5 h-5" />
                    Consejo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    💡 Registra tus gastos diariamente para tener un mejor control de tus finanzas.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="animate-fade-in-up border-0 shadow-2xl liquid-glass liquid-glass-primary hover-lift smooth-transition overflow-hidden"
                style={{ animationDelay: "0.7s" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Lightbulb className="w-5 h-5" />
                    Tip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    🎯 Define metas de ahorro específicas para mantener la motivación y alcanzar tus objetivos.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    )
  }

  return null
}
