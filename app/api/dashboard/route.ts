import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Datos de categorías
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

// Función para crear cliente de Supabase en el servidor
function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

// Función para verificar API key
function verifyApiKey(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  const validApiKey = process.env.N8N_API_KEY || "your-secret-api-key"

  return apiKey === validApiKey
}

// Función para obtener usuario por email
async function getUserByEmail(email: string) {
  const supabase = createSupabaseServerClient()

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("email", email).single()

  if (error || !profile) {
    return null
  }

  return profile
}

// GET /api/dashboard - Obtener datos del dashboard del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    // Obtener usuario por email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const supabase = createSupabaseServerClient()

    // Obtener transacciones del usuario
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (transactionsError) {
      console.error("Error obteniendo transacciones:", transactionsError)
      return NextResponse.json({ error: "Error obteniendo transacciones" }, { status: 500 })
    }

    // Obtener metas de ahorro
    const { data: savingsGoals, error: savingsError } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (savingsError) {
      console.error("Error obteniendo metas:", savingsError)
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
      },
      summary: {
        income: income,
        expenses: expenses,
        balance: balance,
      },
      categories: categoriesWithSpent,
      recentTransactions: transactions?.slice(0, 10) || [],
      savingsGoals: savingsGoals || [],
    })
  } catch (error) {
    console.error("Error en API de dashboard:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
