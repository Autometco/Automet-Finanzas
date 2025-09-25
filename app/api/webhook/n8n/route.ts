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

// Función para procesar texto con IA (simulada)
function parseTransactionFromText(text: string) {
  // Esta función simula el procesamiento de IA
  // En una implementación real, usarías OpenAI o Claude para extraer datos

  const lowerText = text.toLowerCase()

  // Detectar tipo de transacción
  const isExpense = lowerText.includes("gasté") || lowerText.includes("compré") || lowerText.includes("pagué")
  const isIncome = lowerText.includes("recibí") || lowerText.includes("ingreso") || lowerText.includes("cobré")

  // Extraer monto (buscar números)
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/g)
  const amount = amountMatch ? Number.parseFloat(amountMatch[0]) : 0

  // Detectar categoría
  let category = "General"
  if (lowerText.includes("comida") || lowerText.includes("restaurante") || lowerText.includes("alimentación")) {
    category = "Alimentación"
  } else if (lowerText.includes("transporte") || lowerText.includes("uber") || lowerText.includes("taxi")) {
    category = "Transporte"
  } else if (lowerText.includes("hogar") || lowerText.includes("casa") || lowerText.includes("mueble")) {
    category = "Hogar"
  } else if (lowerText.includes("entretenimiento") || lowerText.includes("cine") || lowerText.includes("diversión")) {
    category = "Entretenimiento"
  } else if (lowerText.includes("salud") || lowerText.includes("médico") || lowerText.includes("farmacia")) {
    category = "Salud"
  } else if (lowerText.includes("ropa") || lowerText.includes("vestido") || lowerText.includes("zapatos")) {
    category = "Ropa"
  } else if (lowerText.includes("servicios") || lowerText.includes("luz") || lowerText.includes("agua")) {
    category = "Servicios"
  }

  return {
    type: isExpense ? "expense" : isIncome ? "income" : "expense",
    amount: amount,
    category: category,
    description: text.trim(),
  }
}

// POST /api/webhook/n8n - Webhook específico para n8n con procesamiento de audio/texto
export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 })
    }

    const body = await request.json()
    const { email, text, audio_url, action = "add_transaction" } = body

    // Validar campos requeridos
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    // Obtener usuario por email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const supabase = createSupabaseServerClient()

    // Procesar según la acción
    if (action === "add_transaction") {
      if (!text && !audio_url) {
        return NextResponse.json({ error: "Texto o URL de audio requerido" }, { status: 400 })
      }

      // Si hay audio_url, n8n ya debería haber transcrito el audio
      // Por ahora asumimos que tenemos el texto
      const transactionText = text || "Transacción desde audio"

      // Procesar el texto para extraer datos de la transacción
      const parsedTransaction = parseTransactionFromText(transactionText)

      if (parsedTransaction.amount === 0) {
        return NextResponse.json({ error: "No se pudo extraer el monto de la transacción" }, { status: 400 })
      }

      // Crear transacción
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: parsedTransaction.type,
          amount: parsedTransaction.amount,
          description: parsedTransaction.description,
          category: parsedTransaction.category,
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single()

      if (error) {
        console.error("Error creando transacción:", error)
        return NextResponse.json({ error: "Error creando transacción" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Transacción de ${parsedTransaction.type === "expense" ? "gasto" : "ingreso"} registrada exitosamente`,
        transaction: transaction,
        parsed_data: parsedTransaction,
        original_text: transactionText,
      })
    }

    // Otras acciones futuras (crear metas, consultar balance, etc.)
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 })
  } catch (error) {
    console.error("Error en webhook de n8n:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
