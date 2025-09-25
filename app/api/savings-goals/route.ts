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

// POST /api/savings-goals - Crear meta de ahorro desde n8n
export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, target_amount, target_date } = body

    // Validar campos requeridos
    if (!email || !name || !target_amount) {
      return NextResponse.json({ error: "Campos requeridos: email, name, target_amount" }, { status: 400 })
    }

    // Obtener usuario por email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const supabase = createSupabaseServerClient()

    // Crear meta de ahorro
    const { data: goal, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name: name,
        target_amount: Number(target_amount),
        target_date: target_date,
        current_amount: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creando meta de ahorro:", error)
      return NextResponse.json({ error: "Error creando meta de ahorro" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      goal: goal,
    })
  } catch (error) {
    console.error("Error en API de metas de ahorro:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// GET /api/savings-goals - Obtener metas de ahorro del usuario
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

    // Obtener metas de ahorro del usuario
    const { data: savingsGoals, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error obteniendo metas de ahorro:", error)
      return NextResponse.json({ error: "Error obteniendo metas de ahorro" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      savingsGoals: savingsGoals || [],
    })
  } catch (error) {
    console.error("Error en API de metas de ahorro:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
