import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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

// POST /api/transactions - Crear transacción desde n8n
export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 })
    }

    const body = await request.json()
    const { email, type, amount, description, category, date } = body

    // Validar campos requeridos
    if (!email || !type || !amount || !description) {
      return NextResponse.json({ error: "Campos requeridos: email, type, amount, description" }, { status: 400 })
    }

    // Obtener usuario por email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const supabase = createSupabaseServerClient()

    // Crear transacción
    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: type,
        amount: Math.abs(Number(amount)),
        description: description,
        category: category || "General",
        date: date || new Date().toISOString().split("T")[0],
      })
      .select()
      .single()

    if (error) {
      console.error("Error creando transacción:", error)
      return NextResponse.json({ error: "Error creando transacción" }, { status: 500 })
    }

    // Verificar si hay metas que coincidan
    const { data: savingsGoals } = await supabase.from("savings_goals").select("*").eq("user_id", user.id)

    const normalizeString = (str: string) => str.trim().toLowerCase()
    const matchingGoal = savingsGoals?.find((goal: any) => normalizeString(goal.name) === normalizeString(description))

    let goalUpdated = null

    if (matchingGoal) {
      const transactionAmount = Math.abs(Number(amount))
      let newCurrent = matchingGoal.current_amount

      if (type === "income") {
        newCurrent += transactionAmount
      } else {
        newCurrent = Math.max(0, newCurrent - transactionAmount)
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

      if (!updateError) {
        goalUpdated = {
          name: matchingGoal.name,
          amount: transactionAmount,
          type: type,
          newCurrent: newCurrent,
        }
      }
    }

    return NextResponse.json({
      success: true,
      transaction: transaction,
      goalUpdated: goalUpdated,
    })
  } catch (error) {
    console.error("Error en API de transacciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// GET /api/transactions - Obtener transacciones del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const limit = searchParams.get("limit") || "10"

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
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(Number(limit))

    if (error) {
      console.error("Error obteniendo transacciones:", error)
      return NextResponse.json({ error: "Error obteniendo transacciones" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
    })
  } catch (error) {
    console.error("Error en API de transacciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
