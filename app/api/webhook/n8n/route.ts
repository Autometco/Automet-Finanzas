import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ---------- helpers de infraestructura ----------

// Cliente admin (server-side)
function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// Auth por API key (sin fallback inseguro)
function verifyApiKey(req: NextRequest) {
  const provided = req.headers.get('x-api-key');
  const expected = process.env.N8N_API_KEY;
  return Boolean(expected) && provided === expected;
}

// ---------- helpers de dominio ----------

// Parser simple en español (tus reglas + algunas variantes)
function parseTransactionFromText(text: string) {
  const t = (text || '').toLowerCase();

  // tipo
  const isExpense = /(gast[ée]|compr[éeó]|pag[éeó]|sal[ií]o)/.test(t);
  const isIncome  = /(recib[ií]|ingreso|cobr[éeó]|entr[oó]|deposit[éeó]|abono)/.test(t);
  const type: 'income' | 'expense' = isExpense ? 'expense' : (isIncome ? 'income' : 'expense');

  // monto
  const match = t.match(/(\d+(?:[.,]\d+)?)/);
  const amount = match ? Number.parseFloat(match[1].replace(',', '.')) : 0;

  // categorías básicas
  let category = 'General';
  if (/(comida|restaurante|alimentaci[oó]n)/.test(t)) category = 'Alimentación';
  else if (/(transporte|uber|taxi|bus)/.test(t))    category = 'Transporte';
  else if (/(hogar|casa|mueble)/.test(t))           category = 'Hogar';
  else if (/(entretenimiento|cine|diversi[oó]n)/.test(t)) category = 'Entretenimiento';
  else if (/(salud|m[eé]dico|farmacia)/.test(t))    category = 'Salud';
  else if (/(ropa|vestido|zapatos)/.test(t))        category = 'Ropa';
  else if (/(servicios|luz|agua|internet)/.test(t)) category = 'Servicios';
  else if (/(ahorro|meta)/.test(t))                 category = 'Ahorro';

  return { type, amount, category, description: text?.trim() ?? '' };
}

// Buscar user por email o usar user_id directo
async function resolveUserId({ email, user_id }: { email?: string; user_id?: string }) {
  if (user_id) return user_id;

  if (!email) return null;

  const supabase = createSupabaseAdmin();

  // 1) intentar perfiles.email (si tu tabla lo almacena)
  const { data: maybeProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (maybeProfile?.id) return maybeProfile.id;

  // 2) fallback: admin listUsers y filtrar por email (service_role requerido)
  // Nota: listUsers no filtra por email en la API, así que listamos 200 y filtramos localmente.
  // Para bases pequeñas funciona bien; si creces, crea un RPC o guarda email en profiles.
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) return null;

  const found = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

// ---------- acciones de negocio ----------

async function actionAddTransaction(payload: any) {
  const { email, user_id, text, audio_url, type, amount, description, category, date } = payload;

  const resolvedUserId = await resolveUserId({ email, user_id });

  // Si viene texto/audio => parsear; si ya viene estructurado => usarlo
  let parsed = { type, amount, description, category } as any;

  if (!type || !amount) {
    const textToParse = text || (audio_url ? 'Transacción desde audio' : '');
    parsed = parseTransactionFromText(textToParse);
  }

  if (!parsed.amount || Number.isNaN(Number(parsed.amount))) {
    return { status: 400, body: { error: 'No se pudo determinar el monto' } };
  }
  if (!['income', 'expense'].includes(parsed.type)) {
    return { status: 400, body: { error: 'type inválido (income|expense)' } };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: resolvedUserId,
      type: parsed.type,
      amount: Number(parsed.amount),
      description: parsed.description || description || null,
      category: parsed.category || category || null,
      date: date ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) return { status: 500, body: { error: error.message } };

  return {
    status: 201,
    body: {
      success: true,
      message: `Transacción de ${parsed.type === 'expense' ? 'gasto' : 'ingreso'} registrada`,
      transaction: data,
      parsed_data: parsed,
    },
  };
}

async function actionCreateGoal(payload: any) {
  const { email, user_id, name, target_amount, target_date } = payload;

  if (!name || !target_amount) {
    return { status: 400, body: { error: 'name y target_amount son requeridos' } };
  }

  const resolvedUserId = await resolveUserId({ email, user_id });
  if (!resolvedUserId) return { status: 404, body: { error: 'Usuario no encontrado' } };

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: resolvedUserId,
      name,
      target_amount: Number(target_amount),
      target_date: target_date ?? null,
      current_amount: 0,
    })
    .select()
    .single();

  if (error) return { status: 500, body: { error: error.message } };

  return { status: 201, body: { success: true, goal: data } };
}

async function actionDepositToGoal(payload: any) {
  const { email, user_id, goal_id, goal_name, amount, create_expense_tx = true } = payload;

  if (!amount || Number.isNaN(Number(amount))) {
    return { status: 400, body: { error: 'amount inválido' } };
  }

  const resolvedUserId = await resolveUserId({ email, user_id });
  if (!resolvedUserId) return { status: 404, body: { error: 'Usuario no encontrado' } };

  const supabase = createSupabaseAdmin();

  // Buscar la meta por id o por nombre
  let goal: any = null;
  if (goal_id) {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', goal_id)
      .eq('user_id', resolvedUserId)
      .single();
    if (error || !data) return { status: 404, body: { error: 'Meta no encontrada' } };
    goal = data;
  } else if (goal_name) {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', resolvedUserId)
      .ilike('name', goal_name) // flexible
      .maybeSingle();
    if (error || !data) return { status: 404, body: { error: 'Meta no encontrada' } };
    goal = data;
  } else {
    return { status: 400, body: { error: 'goal_id o goal_name requerido' } };
  }

  const add = Number(amount);
  const newCurrent = Math.min((goal.current_amount ?? 0) + add, goal.target_amount);

  const { error: updateErr } = await supabase
    .from('savings_goals')
    .update({ current_amount: newCurrent })
    .eq('id', goal.id);

  if (updateErr) return { status: 500, body: { error: updateErr.message } };

  let createdTx: any = null;
  if (create_expense_tx) {
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: resolvedUserId,
        type: 'expense',
        category: 'Ahorro',
        description: `Depósito a ${goal.name}`,
        amount: add,
        date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (!txErr) createdTx = tx;
  }

  return {
    status: 200,
    body: {
      success: true,
      goal: { ...goal, current_amount: newCurrent },
      transaction: createdTx,
    },
  };
}

async function actionGetMonthSummary(payload: any) {
  const { email, user_id, month, year } = payload;

  const resolvedUserId = await resolveUserId({ email, user_id });
  if (!resolvedUserId) return { status: 404, body: { error: 'Usuario no encontrado' } };

  const d = new Date();
  const m = Number.isFinite(month) ? month : d.getMonth(); // 0-11
  const y = Number.isFinite(year)  ? year  : d.getFullYear();

  const start = new Date(y, m, 1).toISOString().slice(0, 10);
  const end   = new Date(y, m + 1, 1).toISOString().slice(0, 10);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', resolvedUserId)
    .gte('date', start)
    .lt('date', end);

  if (error) return { status: 500, body: { error: error.message } };

  const income  = (data ?? []).filter(t => t.type === 'income')
                     .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const expense = (data ?? []).filter(t => t.type === 'expense')
                     .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return { status: 200, body: { month: m, year: y, income, expense, balance: income - expense } };
}

// ---------- handler principal ----------

export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'API key inválida' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'add_transaction' } = body;

    switch (action) {
      case 'add_transaction':   return NextResponse.json(...Object.values(await actionAddTransaction(body)));
      case 'create_goal':       return NextResponse.json(...Object.values(await actionCreateGoal(body)));
      case 'deposit_to_goal':   return NextResponse.json(...Object.values(await actionDepositToGoal(body)));
      case 'get_month_summary': return NextResponse.json(...Object.values(await actionGetMonthSummary(body)));
      case 'parse_only':        return NextResponse.json({ parsed: parseTransactionFromText(body.text || '') }, { status: 200 });
      default:
        return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error en webhook n8n:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
