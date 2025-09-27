// app/api/webhook/n8n/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

type Json = Record<string, any>

function bad(status: number, message: string, extra: Json = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}
function ok(status: number, data: Json = {}) {
  return NextResponse.json({ ok: true, ...data }, { status })
}

// --- seguridad ---
function verifyApiKey(req: NextRequest) {
  const header = req.headers.get("x-api-key") || ""
  const env = process.env.N8N_API_KEY || ""
  return header === env
}

// --- supabase admin (server-only) ---
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY! // service_role
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// --- util: resolver usuario por user_id o email ---
async function resolveUserId({ user_id, email }: { user_id?: string; email?: string }) {
  if (user_id) return user_id
  if (!email) return null

  const supabase = supabaseAdmin()

  // 1) intentar en profiles.email
  const { data: profile } = await supabase.from("profiles").select("id,email").eq("email", email).maybeSingle()
  if (profile?.id) return profile.id as string

  // 2) fallback: auth admin
  const { data: users } = await supabase.auth.admin.listUsers()
  const found = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  return found?.id ?? null
}

// --- util: parser simple de texto a transacción ---
function parseTransactionFromText(text: string) {
  const t = text.toLowerCase()
  const isExpense = /(gast[ée]|compr[ée]|pag[ué])/.test(t)
  const isIncome = /(ingreso|recib[íi]|cobré?)/.test(t)
  const type = isIncome ? "income" : "expense"

  const amountMatch = text.match(/(\d+(?:[\.,]\d+)?)/)
  const amount = amountMatch ? Number(amountMatch[0].replace(",", ".")) : 0

  let category = "General"
  if (/(comida|restaurante|alimentación)/.test(t)) category = "Alimentación"
  else if (/(transporte|uber|taxi|bus)/.test(t)) category = "Transporte"
  else if (/(entretenimiento|cine|diversión)/.test(t)) category = "Entretenimiento"
  else if (/(servicios|luz|agua|internet)/.test(t)) category = "Servicios"
  else if (/(salud|médic|farmacia)/.test(t)) category = "Salud"
  else if (/(ropa|vestid|zapato)/.test(t)) category = "Ropa"
  else if (/(hogar|casa|mueble)/.test(t)) category = "Hogar"
  else if (/(ahorro)/.test(t)) category = "Ahorro"

  return { type, amount, category, description: text.trim() }
}

// --- acciones ---
async function actionAddTransaction(payload: Json) {
  const userId = await resolveUserId({ user_id: payload.user_id, email: payload.email })
  if (!userId) return bad(404, "Usuario no encontrado")

  // permitir datos estructurados o text
  const parsed = payload.text
    ? parseTransactionFromText(payload.text as string)
    : {
        type: payload.type ?? "expense",
        amount: Number(payload.amount ?? 0),
        category: payload.category ?? "General",
        description: payload.description ?? "Transacción",
      }

  if (!parsed.amount || parsed.amount <= 0) return bad(400, "Monto inválido o no detectado")

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      date: payload.date ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (error) return bad(500, "Error creando transacción", { detail: error.message })
  return ok(201, { transaction: data, parsed })
}

async function actionCreateGoal(payload: Json) {
  const userId = await resolveUserId({ user_id: payload.user_id, email: payload.email })
  if (!userId) return bad(404, "Usuario no encontrado")

  const name = String(payload.name ?? "").trim()
  const target = Number(payload.target_amount ?? 0)
  const targetDate = payload.target_date ? String(payload.target_date) : null
  if (!name || !target || target <= 0) return bad(400, "Parámetros inválidos (name/target_amount)")

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      user_id: userId,
      name,
      target_amount: target,
      target_date: targetDate,
      current_amount: 0,
    })
    .select()
    .single()

  if (error) return bad(500, "Error creando meta", { detail: error.message })
  return ok(201, { goal: data })
}

async function actionDepositToGoal(payload: Json) {
  const userId = await resolveUserId({ user_id: payload.user_id, email: payload.email })
  if (!userId) return bad(404, "Usuario no encontrado")

  const amount = Number(payload.amount ?? 0)
  if (!amount || amount <= 0) return bad(400, "Monto inválido")

  const supabase = supabaseAdmin()

  // localizar meta por id o por nombre
  let goalId = payload.goal_id as string | undefined
  let goal: any = null

  if (goalId) {
    const { data } = await supabase.from("savings_goals").select("*").eq("id", goalId).eq("user_id", userId).maybeSingle()
    goal = data
  } else if (payload.goal_name) {
    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", String(payload.goal_name))
      .maybeSingle()
    goal = data
  }

  if (!goal) return bad(404, "Meta no encontrada")

  const newCurrent = Math.min(goal.current_amount + amount, goal.target_amount)

  const { error: updErr } = await supabase
    .from("savings_goals")
    .update({ current_amount: newCurrent })
    .eq("id", goal.id)

  if (updErr) return bad(500, "Error actualizando meta", { detail: updErr.message })

  // opcional: registrar transacción de “depósito a …”
  if (payload.create_expense_tx !== false) {
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "expense",
      category: "Ahorro",
      description: `Depósito a ${goal.name}`,
      amount,
      date: new Date().toISOString().slice(0, 10),
    })
  }

  return ok(200, { goal: { ...goal, current_amount: newCurrent } })
}

async function actionGetMonthSummary(payload: Json) {
  const userId = await resolveUserId({ user_id: payload.user_id, email: payload.email })
  if (!userId) return bad(404, "Usuario no encontrado")

  const now = new Date()
  const year = Number(payload.year ?? now.getFullYear())
  const month = Number(payload.month ?? now.getMonth()) // 0..11

  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start.toISOString().slice(0, 10))
    .lt("date", end.toISOString().slice(0, 10))

  if (error) return bad(500, "Error consultando transacciones", { detail: error.message })

  const income = (data ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
  const expense = (data ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
  return ok(200, { year, month, summary: { income, expense, balance: income - expense }, count: data?.length ?? 0 })
}

// --- handler principal ---
export async function POST(req: NextRequest) {
  try {
    if (!verifyApiKey(req)) return bad(401, "API key inválida")
    const body = (await req.json()) as Json
    const action = String(body.action ?? "add_transaction")

    switch (action) {
      case "add_transaction":
        return await actionAddTransaction(body)
      case "create_goal":
        return await actionCreateGoal(body)
      case "deposit_to_goal":
        return await actionDepositToGoal(body)
      case "get_month_summary":
        return await actionGetMonthSummary(body)
      default:
        return bad(400, `Acción no soportada: ${action}`)
    }
  } catch (e: any) {
    console.error("Webhook error:", e)
    return bad(500, "Error interno del servidor")
  }
}
