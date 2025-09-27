import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // ✅ Usa variables de servidor (no NEXT_PUBLIC_)
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  // Logs de diagnóstico (opcionales, luego puedes quitarlos)
  console.log("[v0] Middleware - SUPABASE_URL exists:", !!supabaseUrl)
  console.log("[v0] Middleware - SUPABASE_ANON_KEY exists:", !!supabaseAnonKey)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Middleware - Missing SUPABASE_URL / SUPABASE_ANON_KEY")
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  try {
    // Mantenerlo para refrescar sesión y evitar logouts aleatorios
    await supabase.auth.getUser()
  } catch (error) {
    console.error("[v0] Middleware - Error getUser():", error)
  }

  return supabaseResponse
}
