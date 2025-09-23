"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getCategories, createCategory } from "@/lib/api"
import { ArrowLeft, Plus, Edit, Trash2, Palette } from "lucide-react"
import Link from "next/link"

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "📁",
    color: "#22c55e",
  })

  const availableIcons = [
    "🍔",
    "🚗",
    "🎬",
    "💡",
    "🏥",
    "📚",
    "👕",
    "🏠",
    "💼",
    "💻",
    "📈",
    "🎁",
    "💰",
    "🛒",
    "✈️",
    "🎯",
    "🏋️",
    "🎵",
    "📱",
    "🎨",
    "🌟",
    "⚡",
    "🔥",
    "💎",
  ]

  const availableColors = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
    "#f97316",
    "#6366f1",
  ]

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await getCategories()
        setCategories(result.categories)
      } catch (error) {
        console.error("Error al cargar categorías:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createCategory(newCategory)
      if (result.success) {
        setCategories((prev) => [...prev, result.category])
        setNewCategory({ name: "", icon: "📁", color: "#22c55e" })
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("Error al crear categoría:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Categorías</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                <DialogDescription>Personaliza tus categorías para organizar mejor tus finanzas</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nombre</Label>
                  <Input
                    id="category-name"
                    placeholder="Nombre de la categoría"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Icono</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {availableIcons.map((icon) => (
                      <Button
                        key={icon}
                        type="button"
                        variant={newCategory.icon === icon ? "default" : "outline"}
                        className="h-10 w-10 p-0"
                        onClick={() => setNewCategory((prev) => ({ ...prev, icon }))}
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {availableColors.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        className="h-8 w-8 p-0 rounded-full border-2"
                        style={{
                          backgroundColor: color,
                          borderColor: newCategory.color === color ? "#000" : "transparent",
                        }}
                        onClick={() => setNewCategory((prev) => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!newCategory.name} className="flex-1">
                    Crear Categoría
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <Card className="border-0 shadow-lg animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Mis Categorías
            </CardTitle>
            <CardDescription>Organiza y personaliza las categorías para tus movimientos financieros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${category.id * 0.1}s` }}
                >
                  <CardContent className="p-4 text-center space-y-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{category.name}</h3>
                      <Badge
                        variant="secondary"
                        className="mt-1 text-xs"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }}
                      >
                        Activa
                      </Badge>
                    </div>
                    <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-0 shadow-lg bg-primary/5 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">💡</span>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Consejos para categorías</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Crea categorías específicas para un mejor control</li>
                  <li>• Usa colores distintivos para identificarlas rápidamente</li>
                  <li>• Revisa y ajusta tus categorías mensualmente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
