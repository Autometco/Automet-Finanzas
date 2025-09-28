// app/api/webhook/n8n/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------- Config ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const N8N_API_KEY = process.env.N8N_API_KEY || "your-secret-api-key";

// Admin client (service role)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- Helpers ----------
function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function badRequest(msg: string) {
  return json({ ok: false, error: msg }, 400);
}

function unauthorized() {
  return json({ ok: false, error: "API key inválida" }, 401);
}

function monthRange(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

function toISODateUTC(date = new Date()) {
  // YYYY-MM-DD en UTC
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .split("T")[0];
}

function parseNumber(n: any) {
  const v = typeof n === "string" ? n.replace(",", ".") : n;
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function nowUTC() {
  return new Date().toISOString();
}

async function getProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Parsing muy simple (mejorable con LLM si lo deseas)
function parseTransactionFromText(text: string) {
  const lower = (text || "").toLowerCase();

  const isExpense =
    lower.includes("gast") ||
    lower.includes("pag") ||
    lower.includes("compr") ||
    lower.includes("salid");
  const isIncome =
    lower.includes("ingreso") ||
    lower.includes("recib") ||
    lower.includes("cobr");

  // Monto: primer número decimal
  const amountMatch = text.match(/-?\d+(?:[.,]\d+)?/);
  const amount = amountMatch ? parseNumber(amountMatch[0]) : 0;

  let category = "General";
  const map: Record<string, string> = {
    comida: "Alimentación",
    restaurante: "Alimentación",
    supermercado: "Alimentación",
    uber: "Transporte",
    taxi: "Transporte",
    bus: "Transporte",
    cine: "Entretenimiento",
    juego: "Entretenimiento",
    internet: "Servicios",
    luz: "Servicios",
    agua: "Servicios",
    ropa: "Ropa",
    farmacia: "Salud",
  };
  for (const k of Object.keys(map)) {
    if (lower.includes(k)) {
      category = map[k];
      break;
    }
  }

  const type = isIncome ? "income" : isExpense ? "expense" : amount >= 0 ? "income" : "expense";

  return {
    type,
    amount: Math.abs(amount),
    category,
    description: text?.trim() || "",
  };
}

// Suma segura
function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

// ---------- Actions ----------

// 1) add_transaction
async function addTransaction(payload: any) {
  const { email, text, type, amount, description, category, date } = payload;

  if (!email) return badRequest("Falta email");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  let parsed = undefined as
    | { type: "income" | "expense"; amount: number; category: string; description: string }
    | undefined;

  if (typeof type === "string" && amount !== undefined) {
    parsed = {
      type: type === "income" ? "income" : "expense",
      amount: Math.abs(parseNumber(amount)),
      category: category || "General",
      description: description || "",
    };
  } else if (text) {
    parsed = parseTransactionFromText(text);
  } else {
    return badRequest("Envía {type, amount} o bien {text}");
  }

  if (!parsed.amount || parsed.amount <= 0) {
    return badRequest("Monto inválido");
  }

  const insert = {
    user_id: profile.id,
    type: parsed.type,
    amount: parsed.amount,
    description: parsed.description,
    category: parsed.category || "General",
    date: date || toISODateUTC(new Date()),
    created_at: nowUTC(),
  };

  const { data, error } = await supabase.from("transactions").insert(insert).select().single();
  if (error) throw error;

  return json({ ok: true, transaction: data, parsed });
}

// 2) create_goal
async function createGoal(payload: any) {
  const { email, name, target_amount, target_date } = payload;
  if (!email || !name) return badRequest("Faltan campos: email, name");
  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  const insert = {
    user_id: profile.id,
    name,
    target_amount: parseNumber(target_amount) || 0,
    target_date: target_date || null,
    current_amount: 0,
    created_at: nowUTC(),
  };

  const { data, error } = await supabase.from("savings_goals").insert(insert).select().single();
  if (error) throw error;

  return json({ ok: true, goal: data });
}

// 3) deposit_to_goal
async function depositToGoal(payload: any) {
  const { email, goal_name, amount } = payload;
  if (!email || !goal_name || amount === undefined) {
    return badRequest("Faltan campos: email, goal_name, amount");
  }

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  const { data: goal, error: gErr } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", profile.id)
    .eq("name", goal_name)
    .maybeSingle();

  if (gErr) throw gErr;
  if (!goal) return badRequest("Meta no encontrada");

  const newCurrent = Math.min(goal.current_amount + Math.abs(parseNumber(amount)), goal.target_amount);

  const { error: uErr } = await supabase
    .from("savings_goals")
    .update({ current_amount: newCurrent, updated_at: nowUTC() })
    .eq("id", goal.id);
  if (uErr) throw uErr;

  return json({ ok: true, goal: { ...goal, current_amount: newCurrent } });
}

// 4) list_transactions (básico con filtros)
async function listTransactions(payload: any) {
  const { email, from, to, type, category, limit = 20 } = payload;
  if (!email) return badRequest("Falta email");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  let q = supabase.from("transactions").select("*").eq("user_id", profile.id).order("date", { ascending: false });

  if (type) q = q.eq("type", type);
  if (category) q = q.eq("category", category);
  if (from) q = q.gte("date", from);
  if (to) q = q.lt("date", to);

  q = q.limit(Math.max(1, Math.min(200, Number(limit) || 20)));

  const { data, error } = await q;
  if (error) throw error;

  return json({ ok: true, items: data });
}

// 5) get_balance (mes actual)
async function getBalance(payload: any) {
  const { email } = payload;
  if (!email) return badRequest("Falta email");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  const { start, end } = monthRange(new Date());

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, category, date")
    .eq("user_id", profile.id)
    .gte("date", toISODateUTC(start))
    .lt("date", toISODateUTC(end));

  if (error) throw error;

  const income = sum((data || []).filter((t) => t.type === "income").map((t) => Number(t.amount) || 0));
  const expenses = sum((data || []).filter((t) => t.type === "expense").map((t) => Number(t.amount) || 0));
  const balance = income - expenses;

  return json({ ok: true, summary: { income, expenses, balance, month: toISODateUTC(start).slice(0, 7) } });
}

// 6) check_spending_alerts (simple)
async function checkSpendingAlerts(payload: any) {
  const { email } = payload;
  if (!email) return badRequest("Falta email");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  const { start, end } = monthRange(new Date());

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, category, date")
    .eq("user_id", profile.id)
    .gte("date", toISODateUTC(start))
    .lt("date", toISODateUTC(end));

  if (error) throw error;

  const byCat = new Map<string, number>();
  let income = 0,
    expenses = 0;
  for (const t of data || []) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") income += amt;
    if (t.type === "expense") {
      expenses += amt;
      byCat.set(t.category || "General", (byCat.get(t.category || "General") || 0) + amt);
    }
  }

  // Alertas simples: top categorías por gasto y % sobre income
  const alerts: string[] = [];
  const ranked = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [cat, amt] of ranked) {
    const pct = income > 0 ? Math.round((amt / income) * 100) : 0;
    if (pct >= 30) {
      alerts.push(`⚠️ En ${cat} llevas ${pct}% de tus ingresos del mes. Considera reducir ese rubro.`);
    } else if (pct >= 20) {
      alerts.push(`⚠️ ${cat}: ${pct}% de tus ingresos. Monitorea para no excederte.`);
    }
  }

  return json({
    ok: true,
    alerts,
    snapshot: { income, expenses, topCategories: ranked.map(([c, a]) => ({ category: c, amount: a })) },
  });
}

// 7) advise_expense (aconseja si conviene o no el gasto)
async function adviseExpense(payload: any) {
  const { email, amount, category = "General", description = "" } = payload;
  if (!email || amount === undefined) return badRequest("Faltan campos: email, amount");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  const amt = Math.abs(parseNumber(amount));

  // Resumen del mes
  const { start, end } = monthRange(new Date());
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, category, date")
    .eq("user_id", profile.id)
    .gte("date", toISODateUTC(start))
    .lt("date", toISODateUTC(end));
  if (error) throw error;

  const income = sum((data || []).filter((t) => t.type === "income").map((t) => Number(t.amount) || 0));
  const expenses = sum((data || []).filter((t) => t.type === "expense").map((t) => Number(t.amount) || 0));
  const balance = income - expenses;

  const spentInCategory = sum(
    (data || [])
      .filter((t) => t.type === "expense" && (t.category || "General") === category)
      .map((t) => Number(t.amount) || 0),
  );

  // Reglas muy simples y transparentes
  let decision: "approve" | "caution" | "deny" = "approve";
  const reasons: string[] = [];

  if (balance <= 0) {
    decision = "deny";
    reasons.push("Tu balance del mes ya es negativo.");
  } else if (amt > balance * 0.5) {
    decision = "deny";
    reasons.push("El monto supera el 50% del margen disponible del mes.");
  } else if (amt > Math.max(50, income * 0.05)) {
    decision = "caution";
    reasons.push("El monto es elevado respecto a tus ingresos mensuales.");
  }

  const catPct = income > 0 ? Math.round((spentInCategory / income) * 100) : 0;
  if (catPct > 30) {
    decision = decision === "deny" ? "deny" : "caution";
    reasons.push(`Ya llevas ${catPct}% de tus ingresos gastados en ${category} este mes.`);
  }

  // Sugerencias simples
  const suggestions: string[] = [];
  if (decision !== "approve") {
    suggestions.push("Considera posponer 48h y reevaluar si sigue siendo necesario.");
    suggestions.push("Aplica la regla 50/30/20: prioriza necesidades y ahorro antes de deseos.");
  } else {
    suggestions.push("Puedes hacerlo sin comprometer tu mes. Regístralo para mantener control.");
  }

  return json({
    ok: true,
    decision,
    reasons,
    context: { month_income: income, month_expenses: expenses, month_balance: balance, spent_in_category: spentInCategory },
    suggestion: suggestions[0],
    details: suggestions.slice(1),
    echo: { amount: amt, category, description },
  });
}

// 8) suggest_saving_methods (con números 50/30/20)
async function suggestSavingMethods(payload: any) {
  const { email } = payload;
  if (!email) return badRequest("Falta email");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  // Tomamos ingresos del mes actual como base
  const { start, end } = monthRange(new Date());
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, date")
    .eq("user_id", profile.id)
    .gte("date", toISODateUTC(start))
    .lt("date", toISODateUTC(end));
  if (error) throw error;

  const income = sum((data || []).filter((t) => t.type === "income").map((t) => Number(t.amount) || 0));

  const baseIncome = income || 0;
  const rule_50 = Math.round(baseIncome * 0.5);
  const rule_30 = Math.round(baseIncome * 0.3);
  const rule_20 = Math.round(baseIncome * 0.2);

  const methods = [
    {
      name: "50/30/20",
      summary:
        "50% necesidades, 30% deseos, 20% ahorro/deuda. Ajusta si tienes deudas altas (prioriza más ahorro).",
      example: { needs: rule_50, wants: rule_30, saving: rule_20, base: baseIncome },
    },
    {
      name: "Págate primero (Pay Yourself First)",
      summary: "Automatiza un % fijo al ahorro al inicio del mes (ej. 10%–20%) y vive con el resto.",
    },
    {
      name: "Sobres (Envelope System)",
      summary:
        "Asigna montos por categoría (efectivo o virtual). Cuando se acaba el sobre, no gastas más en ese rubro.",
    },
    {
      name: "Regla de las 48 horas",
      summary: "Para compras no esenciales, espera dos días. Ayuda a reducir compras impulsivas.",
    },
  ];

  return json({
    ok: true,
    income_base: baseIncome,
    methods,
    tip: baseIncome
      ? `Con ingresos ~${baseIncome}, podrías apuntar a ~${rule_20} de ahorro mensual.`
      : "Registra tus ingresos para personalizar mejor los montos.",
  });
}

// 9) forecast_cashflow (proyección simple fin de mes)
async function forecastCashflow(payload: any) {
  const { email } = payload;
  if (!email) return badRequest("Falta email");

  const profile = await getProfileByEmail(email);
  if (!profile) return badRequest("Usuario no encontrado");

  const today = new Date();
  const { start, end } = monthRange(today);

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, date")
    .eq("user_id", profile.id)
    .gte("date", toISODateUTC(start))
    .lt("date", toISODateUTC(end));
  if (error) throw error;

  const dayOfMonth = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();

  const incomeSoFar = sum((data || []).filter((t) => t.type === "income").map((t) => Number(t.amount) || 0));
  const expensesSoFar = sum((data || []).filter((t) => t.type === "expense").map((t) => Number(t.amount) || 0));

  const dailyIncome = dayOfMonth > 0 ? incomeSoFar / dayOfMonth : 0;
  const dailyExpense = dayOfMonth > 0 ? expensesSoFar / dayOfMonth : 0;

  const projectedIncome = Math.round(dailyIncome * daysInMonth);
  const projectedExpenses = Math.round(dailyExpense * daysInMonth);
  const projectedBalance = projectedIncome - projectedExpenses;

  return json({
    ok: true,
    today: toISODateUTC(today),
    so_far: { income: incomeSoFar, expenses: expensesSoFar },
    projected: { income: projectedIncome, expenses: projectedExpenses, balance: projectedBalance },
  });
}

// ---------- Handler ----------
export async function POST(request: NextRequest) {
  // 1) API Key
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== N8N_API_KEY) return unauthorized();

  // 2) Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const action = String(body?.action || "").trim();

  try {
    switch (action) {
      case "add_transaction":
        return await addTransaction(body);
      case "create_goal":
        return await createGoal(body);
      case "deposit_to_goal":
        return await depositToGoal(body);
      case "list_transactions":
        return await listTransactions(body);
      case "get_balance":
        return await getBalance(body);
      case "check_spending_alerts":
        return await checkSpendingAlerts(body);
      case "advise_expense":
        return await adviseExpense(body);
      case "suggest_saving_methods":
        return await suggestSavingMethods(body);
      case "forecast_cashflow":
        return await forecastCashflow(body);

      default:
        return badRequest(`Acción no soportada: ${action}`);
    }
  } catch (err: any) {
    console.error("[n8n webhook] Error:", err);
    return json({ ok: false, error: err?.message || "Error interno" }, 500);
  }
}
