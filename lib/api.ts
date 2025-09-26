import { createClient } from "@/lib/supabase/client"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Datos simulados para desarrollo
const mockCategories = [
  { id: 1, name: "Alimentación", icon: "🍔", color: "#22c55e", fill: "#22c55e" },
  { id: 2, name: "Transporte", icon: "🚗", color: "#3b82f6", fill: "#3b82f6" },
  { id: 3, name: "Entretenimiento", icon: "🎬", color: "#f59e0b", fill: "#f59e0b" },
  { id: 4, name: "Servicios", icon: "💡", color: "#ef4444", fill: "#ef4444" },
  { id: 5, name: "Salud", icon: "🏥", color: "#8b5cf6", fill: "#8b5cf6" },
  { id: 6, name: "Educación", icon: "📚", color: "#06b6d4", fill: "#06b6d4" },
  { id: 7, name: "Ropa", icon: "👕", color: "#ec4899", fill: "#ec4899" },
  { id: 8, name: "Hogar", icon: "🏠", color: "#84cc16", fill: "#84cc16" },
  { id: 9, name: "Ahorro", icon: "💰", color: "#10b981", fill: "#10b981" },
]

export const loginUser = async (formData: { email: string; password: string }) => {
  await sleep(500)
  console.log("[v0] Iniciando sesión con Supabase:", formData.email)

  const supabase = createClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (error) {
      console.error("[v0] Error de autenticación:", error.message)
      return {
        success: false,
        error: error.message,
      }
    }

    if (data.user) {
      console.log("[v0] Usuario autenticado exitosamente:", data.user.email)
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email,
        },
      }
    }

    return {
      success: false,
      error: "Error desconocido al iniciar sesión",
    }
  } catch (error) {
    console.error("[v0] Error en loginUser:", error)
    return {
      success: false,
      error: "Error de conexión",
    }
  }
}

export const registerUser = async (userData: any) => {
  await sleep(1000)
  console.log("[v0] Registrando usuario con Supabase:", userData.email)

  const supabase = createClient()

  try {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/confirm`,
        data: {
          name: userData.firstName + " " + userData.lastName,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      },
    })

    if (error) {
      console.error("[v0] Error de registro:", error.message)
      return { success: false, error: error.message }
    }

    if (data.user) {
      // El perfil se creará automáticamente cuando el usuario confirme su email
      // gracias al trigger de la base de datos

      console.log("[v0] Usuario registrado exitosamente:", data.user.email)
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: userData.firstName + " " + userData.lastName,
        },
        needsEmailConfirmation: !data.session, // Indica si necesita confirmar email
      }
    }

    return {
      success: false,
      error: "Error desconocido al registrar usuario",
    }
  } catch (error) {
    console.error("[v0] Error en registerUser:", error)
    return {
      success: false,
      error: "Error de conexión",
    }
  }
}

export const getDashboardData = async () => {
  await sleep(800)
  console.log("[v0] Obteniendo datos del dashboard desde Supabase")

  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("[v0] No hay usuario autenticado")
      return { error: "Usuario no autenticado" }
    }

    // Obtener perfil del usuario para mostrar el nombre
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[v0] Error obteniendo perfil:", profileError)
    }

    // Obtener transacciones del usuario
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (transactionsError) {
      console.error("[v0] Error obteniendo transacciones:", transactionsError)
      return { error: "Error obteniendo transacciones" }
    }

    // Obtener metas de ahorro
    const { data: savingsGoals, error: savingsError } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (savingsError) {
      console.error("[v0] Error obteniendo metas:", savingsError)
    }

    // Calcular estadísticas del mes actual
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyTransactions = (transactions || []).filter((t: any) => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
    })

    const income = monthlyTransactions
      .filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

    const expenses = monthlyTransactions
      .filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

    const balance = income - expenses

    // Calcular gastos por categoría
    const categoriesWithSpent = mockCategories
      .map((category) => {
        const categoryTransactions = monthlyTransactions.filter(
          (t: any) => t.type === "expense" && t.category === category.name,
        )
        const spent = categoryTransactions.reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

        return {
          ...category,
          spent: spent,
          budget:
            category.name === "Alimentación"
              ? 15000
              : category.name === "Transporte"
                ? 10000
                : category.name === "Entretenimiento"
                  ? 6000
                  : 5000,
          fill: category.color,
        }
      })
      .filter((c) => c.spent > 0)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || user.email,
      },
      summary: {
        income: income,
        expenses: expenses,
        balance: balance,
      },
      categories: categoriesWithSpent,
      recentTransactions: transactions?.slice(0, 10) || [],
      savingsGoals: savingsGoals || [],
    }
  } catch (error) {
    console.error("[v0] Error en getDashboardData:", error)
    return { error: "Error obteniendo datos del dashboard" }
  }
}

export const addTransaction = async (transactionData: any) => {
  await sleep(600)
  console.log("[v0] Agregando transacción a Supabase:", transactionData)

  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description,
        category: transactionData.category,
        date: transactionData.date || new Date().toISOString().split("T")[0],
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error agregando transacción:", error)
      return { success: false, error: error.message }
    }

    // Verificar si hay metas que coincidan
    const { data: savingsGoals } = await supabase.from("savings_goals").select("*").eq("user_id", user.id)

    const normalizeString = (str: string) => str.trim().toLowerCase()
    const matchingGoal = savingsGoals?.find(
      (goal: any) => normalizeString(goal.name) === normalizeString(transactionData.description),
    )

    if (matchingGoal) {
      const amount = Math.abs(transactionData.amount)
      let newCurrent = matchingGoal.current_amount

      if (transactionData.type === "income") {
        newCurrent += amount
      } else {
        newCurrent = Math.max(0, newCurrent - amount)
      }

      // Asegurar que no exceda el target
      if (newCurrent > matchingGoal.target_amount) {
        newCurrent = matchingGoal.target_amount
      }

      // Actualizar la meta
      const { error: updateError } = await supabase
        .from("savings_goals")
        .update({ current_amount: newCurrent })
        .eq("id", matchingGoal.id)

      if (updateError) {
        console.error("[v0] Error actualizando meta:", updateError)
      } else {
        return {
          success: true,
          transaction: transaction,
          goalUpdated: {
            name: matchingGoal.name,
            amount: amount,
            type: transactionData.type,
            newCurrent: newCurrent,
          },
        }
      }
    }

    return {
      success: true,
      transaction: transaction,
    }
  } catch (error) {
    console.error("[v0] Error en addTransaction:", error)
    return { success: false, error: "Error agregando transacción" }
  }
}

export const getCategories = async () => {
  await sleep(400)
  return {
    categories: mockCategories,
  }
}

export const addSavingsGoal = async (goalData: any) => {
  await sleep(500)
  console.log("[v0] Agregando meta de ahorro a Supabase:", goalData)

  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data: goal, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name: goalData.name,
        target_amount: goalData.target,
        target_date: goalData.targetDate || null, // Use null if targetDate is not provided
        current_amount: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error agregando meta:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      goal: goal,
    }
  } catch (error) {
    console.error("[v0] Error en addSavingsGoal:", error)
    return { success: false, error: "Error agregando meta de ahorro" }
  }
}

export const depositToSavingsGoal = async (goalId: string, amount: number, source: string) => {
  await sleep(500)
  console.log("[v0] Depositando en meta de ahorro:", goalId, amount, "desde:", source)

  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Obtener la meta
    const { data: goal, error: goalError } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single()

    if (goalError || !goal) {
      return { success: false, error: "Meta no encontrada" }
    }

    // Actualizar la meta
    const newCurrent = Math.min(goal.current_amount + amount, goal.target_amount)

    const { error: updateError } = await supabase
      .from("savings_goals")
      .update({ current_amount: newCurrent })
      .eq("id", goalId)

    if (updateError) {
      console.error("[v0] Error actualizando meta:", updateError)
      return { success: false, error: updateError.message }
    }

    // Si viene de ingreso, crear transacción
    if (source === "ingreso") {
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          category: "Ahorro",
          description: `Depósito a ${goal.name}`,
          amount: amount,
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single()

      if (transactionError) {
        console.error("[v0] Error creando transacción:", transactionError)
      }

      return {
        success: true,
        goal: { ...goal, current_amount: newCurrent },
        transaction: transaction,
        source: source,
      }
    }

    return {
      success: true,
      goal: { ...goal, current_amount: newCurrent },
      source: source,
    }
  } catch (error) {
    console.error("[v0] Error en depositToSavingsGoal:", error)
    return { success: false, error: "Error depositando en meta" }
  }
}

export const deleteSavingsGoal = async (goalId: string) => {
  await sleep(500)
  console.log("[v0] Eliminando meta de ahorro:", goalId)

  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { error } = await supabase.from("savings_goals").delete().eq("id", goalId).eq("user_id", user.id)

    if (error) {
      console.error("[v0] Error eliminando meta:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      deletedGoalId: goalId,
    }
  } catch (error) {
    console.error("[v0] Error en deleteSavingsGoal:", error)
    return { success: false, error: "Error eliminando meta" }
  }
}

export const startNewMonth = async () => {
  await sleep(800)
  console.log("[v0] Iniciando nuevo mes en Supabase")

  // Para simplificar, solo retornamos éxito
  // En una implementación real, podrías crear una tabla de historial mensual
  return {
    success: true,
    savedMonth: {
      id: Date.now().toString(),
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      date: new Date().toISOString(),
    },
    history: [],
  }
}

export const getMonthlyHistory = async () => {
  await sleep(400)
  console.log("[v0] Obteniendo historial mensual desde Supabase")

  // Para simplificar, retornamos array vacío
  // En una implementación real, consultarías una tabla de historial
  return []
}

// Mantener funciones adicionales para compatibilidad
export const createCategory = async (categoryData: any) => {
  await sleep(500)
  return { success: true, category: categoryData }
}

export const getMotivationalStats = async () => {
  await sleep(300)
  const dashboardData = await getDashboardData()

  if (dashboardData.error) {
    return { savingsPercentage: 0, yearEndProjection: 0, goalsProgress: 0, monthlySavings: 0 }
  }

  const { summary, savingsGoals } = dashboardData
  const savings = summary.balance
  const savingsPercentage = summary.income > 0 ? Math.round((savings / summary.income) * 100) : 0
  const yearEndProjection = savings * 12

  const totalGoalsTarget = savingsGoals.reduce((sum: number, goal: any) => sum + goal.target_amount, 0)
  const totalGoalsCurrent = savingsGoals.reduce((sum: number, goal: any) => sum + goal.current_amount, 0)
  const goalsProgress = totalGoalsTarget > 0 ? Math.round((totalGoalsCurrent / totalGoalsTarget) * 100) : 0

  return {
    savingsPercentage,
    yearEndProjection,
    goalsProgress,
    monthlySavings: savings,
  }
}

export const resendConfirmationEmail = async (email: string) => {
  await sleep(500)
  console.log("[v0] Reenviando email de confirmación para:", email)

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      console.error("[v0] Error reenviando email:", error.message)
      return { success: false, error: error.message }
    }

    console.log("[v0] Email de confirmación reenviado exitosamente")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error en resendConfirmationEmail:", error)
    return { success: false, error: "Error de conexión" }
  }
}
