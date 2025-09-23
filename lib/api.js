const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Funciones de almacenamiento local
const getStoredData = (key, defaultValue = []) => {
  if (typeof window === "undefined") return defaultValue
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : defaultValue
}

const setStoredData = (key, data) => {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

export const loginUser = async (email, password) => {
  await sleep(500)
  console.log("Iniciando sesión:", email)
  return {
    success: true,
    token: "fake-jwt-token",
    user: {
      name: "Usuario Demo",
      email: email,
      id: "123",
    },
  }
}

export const registerUser = async (userData) => {
  await sleep(1000)
  console.log("Registrando usuario:", userData)

  if (typeof window !== "undefined") {
    localStorage.removeItem("transactions")
    localStorage.removeItem("savingsGoals")
    localStorage.removeItem("monthlyHistory")
    // Mantener las categorías por defecto pero limpiar cualquier categoría personalizada
    localStorage.removeItem("categories")
    console.log("[v0] Dashboard limpiado para nuevo usuario")
  }

  // Guardar usuario en localStorage
  const user = {
    id: Date.now().toString(), // Usar timestamp único para cada usuario
    name: userData.name || "Usuario",
    email: userData.email,
    ...userData,
  }
  setStoredData("user", user)

  return {
    success: true,
    user: user,
  }
}

export const getDashboardData = async () => {
  await sleep(800)

  // Obtener datos reales del localStorage
  const transactions = getStoredData("transactions", [])
  const categories = getStoredData("categories", [
    { id: 1, name: "Alimentación", icon: "🍔", color: "#22c55e", fill: "#22c55e", budget: 15000 },
    { id: 2, name: "Transporte", icon: "🚗", color: "#3b82f6", fill: "#3b82f6", budget: 10000 },
    { id: 3, name: "Entretenimiento", icon: "🎬", color: "#f59e0b", fill: "#f59e0b", budget: 6000 },
    { id: 4, name: "Servicios", icon: "💡", color: "#ef4444", fill: "#ef4444", budget: 5000 },
    { id: 5, name: "Salud", icon: "🏥", color: "#8b5cf6", fill: "#8b5cf6", budget: 4000 },
    { id: 6, name: "Educación", icon: "📚", color: "#06b6d4", fill: "#06b6d4", budget: 3000 },
    { id: 7, name: "Ropa", icon: "👕", color: "#ec4899", fill: "#ec4899", budget: 4000 },
    { id: 8, name: "Hogar", icon: "🏠", color: "#84cc16", fill: "#84cc16", budget: 8000 },
    { id: 9, name: "Ahorro", icon: "💰", color: "#10b981", fill: "#10b981", budget: 0 },
  ])
  const savingsGoals = getStoredData("savingsGoals", [])

  // Calcular estadísticas reales
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthlyTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date)
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
  })

  const income = monthlyTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const expenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const balance = income - expenses

  // Calcular gastos por categoría
  const categoriesWithSpent = categories
    .map((category) => {
      const categoryTransactions = monthlyTransactions.filter(
        (t) => t.type === "expense" && t.category === category.name,
      )
      const spent = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

      return {
        ...category,
        spent: spent,
        fill: category.color,
      }
    })
    .filter((c) => c.spent > 0) // Solo mostrar categorías con gastos

  return {
    summary: {
      income: income,
      expenses: expenses,
      balance: balance,
    },
    categories: categoriesWithSpent,
    recentTransactions: transactions.slice(-10).reverse(), // Últimas 10 transacciones
    savingsGoals: savingsGoals,
  }
}

export const addTransaction = async (transactionData) => {
  await sleep(600)
  console.log("Agregando transacción:", transactionData)

  const transactions = getStoredData("transactions", [])
  const newTransaction = {
    id: Date.now(),
    ...transactionData,
    date: transactionData.date || new Date().toISOString().split("T")[0],
  }

  transactions.push(newTransaction)
  setStoredData("transactions", transactions)

  const savingsGoals = getStoredData("savingsGoals", [])
  console.log(
    "[v0] Metas de ahorro disponibles:",
    savingsGoals.map((g) => g.name),
  )
  console.log("[v0] Descripción de transacción:", transactionData.description)

  // Normalizar strings para comparación (quitar espacios y convertir a minúsculas)
  const normalizeString = (str) => str.trim().toLowerCase()

  const matchingGoal = savingsGoals.find(
    (goal) => normalizeString(goal.name) === normalizeString(transactionData.description),
  )

  console.log("[v0] Meta coincidente encontrada:", matchingGoal ? matchingGoal.name : "Ninguna")

  if (matchingGoal) {
    const amount = Math.abs(transactionData.amount)

    if (transactionData.type === "income") {
      matchingGoal.current += amount
      console.log(`[v0] Depositado $${amount} en meta: ${matchingGoal.name}`)
    } else {
      // Si es un gasto que coincide con una meta, se resta del progreso
      matchingGoal.current = Math.max(0, matchingGoal.current - amount)
      console.log(`[v0] Retirado $${amount} de meta: ${matchingGoal.name}`)
    }

    // Asegurar que current no exceda el target
    if (matchingGoal.current > matchingGoal.target) {
      matchingGoal.current = matchingGoal.target
    }

    setStoredData("savingsGoals", savingsGoals)
    console.log(`[v0] Nueva cantidad en meta ${matchingGoal.name}: $${matchingGoal.current}`)

    // Agregar información de la meta actualizada al resultado
    return {
      success: true,
      transaction: newTransaction,
      goalUpdated: {
        name: matchingGoal.name,
        amount: amount,
        type: transactionData.type,
        newCurrent: matchingGoal.current,
      },
    }
  }

  return {
    success: true,
    transaction: newTransaction,
  }
}

export const getCategories = async () => {
  await sleep(400)
  return {
    categories: getStoredData("categories", [
      { id: 1, name: "Alimentación", icon: "🍔", color: "#22c55e", fill: "#22c55e" },
      { id: 2, name: "Transporte", icon: "🚗", color: "#3b82f6", fill: "#3b82f6" },
      { id: 3, name: "Entretenimiento", icon: "🎬", color: "#f59e0b", fill: "#f59e0b" },
      { id: 4, name: "Servicios", icon: "💡", color: "#ef4444", fill: "#ef4444" },
      { id: 5, name: "Salud", icon: "🏥", color: "#8b5cf6", fill: "#8b5cf6" },
      { id: 6, name: "Educación", icon: "📚", color: "#06b6d4", fill: "#06b6d4" },
      { id: 7, name: "Ropa", icon: "👕", color: "#ec4899", fill: "#ec4899" },
      { id: 8, name: "Hogar", icon: "🏠", color: "#84cc16", fill: "#84cc16" },
      { id: 9, name: "Ahorro", icon: "💰", color: "#10b981", fill: "#10b981" },
    ]),
  }
}

export const createCategory = async (categoryData) => {
  await sleep(500)
  console.log("Creando categoría:", categoryData)

  const categories = getStoredData("categories", [])
  const newCategory = {
    id: Date.now(),
    ...categoryData,
  }

  categories.push(newCategory)
  setStoredData("categories", categories)

  return {
    success: true,
    category: newCategory,
  }
}

export const addSavingsGoal = async (goalData) => {
  await sleep(500)
  console.log("Agregando meta de ahorro:", goalData)

  const goals = getStoredData("savingsGoals", [])
  const newGoal = {
    id: Date.now(),
    current: 0,
    ...goalData,
  }

  goals.push(newGoal)
  setStoredData("savingsGoals", goals)

  return {
    success: true,
    goal: newGoal,
  }
}

export const depositToSavingsGoal = async (goalId, amount, source) => {
  await sleep(500)
  console.log("Depositando en meta de ahorro:", goalId, amount, "desde:", source)

  const goals = getStoredData("savingsGoals", [])
  const goalIndex = goals.findIndex((g) => g.id === goalId)

  if (goalIndex === -1) {
    return { success: false, error: "Meta no encontrada" }
  }

  goals[goalIndex].current = Math.min(goals[goalIndex].current + amount, goals[goalIndex].target)
  setStoredData("savingsGoals", goals)

  if (source === "ingreso") {
    const transactions = getStoredData("transactions", [])
    const depositTransaction = {
      id: Date.now(),
      type: "expense",
      category: "Ahorro",
      description: `Depósito a ${goals[goalIndex].name}`,
      amount: amount,
      date: new Date().toISOString().split("T")[0],
    }

    transactions.push(depositTransaction)
    setStoredData("transactions", transactions)

    return {
      success: true,
      goal: goals[goalIndex],
      transaction: depositTransaction,
      source: source,
    }
  }

  // Si viene de ahorros, no crear transacción de gasto
  return {
    success: true,
    goal: goals[goalIndex],
    source: source,
  }
}

export const getMotivationalStats = async () => {
  await sleep(300)

  const transactions = getStoredData("transactions", [])
  const savingsGoals = getStoredData("savingsGoals", [])

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthlyTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date)
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
  })

  const income = monthlyTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const expenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const savings = income - expenses

  const savingsPercentage = income > 0 ? Math.round((savings / income) * 100) : 0
  const yearEndProjection = savings * 12

  const totalGoalsTarget = savingsGoals.reduce((sum, goal) => sum + goal.target, 0)
  const totalGoalsCurrent = savingsGoals.reduce((sum, goal) => sum + goal.current, 0)
  const goalsProgress = totalGoalsTarget > 0 ? Math.round((totalGoalsCurrent / totalGoalsTarget) * 100) : 0

  return {
    savingsPercentage,
    yearEndProjection,
    goalsProgress,
    monthlySavings: savings,
  }
}

export const startNewMonth = async () => {
  await sleep(800)

  const transactions = getStoredData("transactions", [])
  const monthlyHistory = getStoredData("monthlyHistory", [])

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // Calcular estadísticas del mes actual
  const monthlyTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date)
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
  })

  const income = monthlyTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const expenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const savings = income - expenses

  // Guardar en historial
  const monthData = {
    month: currentMonth,
    year: currentYear,
    income,
    expenses,
    savings,
    date: new Date().toISOString(),
  }

  monthlyHistory.push(monthData)
  setStoredData("monthlyHistory", monthlyHistory)

  // Limpiar transacciones del mes actual
  const remainingTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date)
    return !(transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear)
  })

  setStoredData("transactions", remainingTransactions)

  return {
    success: true,
    savedMonth: monthData,
    history: monthlyHistory,
  }
}

export const getMonthlyHistory = async () => {
  await sleep(400)
  return getStoredData("monthlyHistory", [])
}

export const deleteSavingsGoal = async (goalId) => {
  await sleep(500)
  console.log("Eliminando meta de ahorro:", goalId)

  const goals = getStoredData("savingsGoals", [])
  const filteredGoals = goals.filter((g) => g.id !== goalId)

  setStoredData("savingsGoals", filteredGoals)

  return {
    success: true,
    deletedGoalId: goalId,
  }
}
