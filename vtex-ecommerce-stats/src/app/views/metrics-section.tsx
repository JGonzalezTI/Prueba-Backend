"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Package, Truck, MapPin, Clock } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useEffect, useState } from "react"

interface DashboardData {
  generalMetrics: {
    totalOrders: number
    totalProducts: number
    totalValue: number
    totalWarehouses: number
    totalCities: number
  }
  topProducts: Array<{
    id: string
    name: string
    category: string
    totalOrders: number
    totalQuantity: number
    totalValue: number
  }>
  topCities: Array<{
    city: string
    state: string
    country: string
    totalOrders: number
    totalQuantity: number
    totalValue: number
  }>
  categoryDistribution: Array<{
    category: string
    totalOrders: number
    totalQuantity: number
    percentage: number
  }>
  temporalTrends: Array<{
    month: string
    totalOrders: number
    totalQuantity: number
    totalValue: number
  }>
}

interface MetricsSectionProps {
  dateRange: string
}

export function MetricsSection({ dateRange }: MetricsSectionProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard')
        const result = await response.json()
        setData(result.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading || !data) {
    return <div>Cargando...</div>
  }

  const kpiData = [
    {
      title: "Total Productos",
      value: data.generalMetrics.totalProducts.toLocaleString(),
      subtitle: `productos en stock`,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Total Pedidos",
      value: data.generalMetrics.totalOrders.toLocaleString(),
      subtitle: `ordenes generadas`,
      icon: Truck,
      color: "text-green-600",
    },
    {
      title: "Almacenes",
      value: data.generalMetrics.totalWarehouses.toString(),
      subtitle: `almacenes activos`,
      icon: MapPin,
      color: "text-purple-600",
    },
    {
      title: "Valor Total",
      value: `$${(data.generalMetrics.totalValue / 100).toFixed()}`,
      subtitle: ` pedidos totales`,
      icon: Clock,
      color: "text-orange-600",
    },
  ]

  const trendData = data.temporalTrends.map(trend => ({
    name: new Date(trend.month).toLocaleDateString('es-ES', { month: 'short' }),
    value: trend.totalQuantity,
  }))

  const categoryData = data.categoryDistribution.map(category => ({
    name: category.category,
    value: category.percentage,
    color: getCategoryColor(category.category),
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{kpi.title}</CardTitle>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center text-xs text-gray-600">
                  <span>{kpi.subtitle}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencias Temporales */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Movimientos</CardTitle>
            <CardDescription>Volumen de productos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por Categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categorías</CardTitle>
            <CardDescription>Porcentaje de productos por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Función auxiliar para generar colores consistentes basados en el nombre de la categoría
function getCategoryColor(categoryName: string) {
  const colorMap: { [key: string]: string } = {
    'Botas': '#3B82F6',      // Azul
    'Zapatos': '#10B981',    // Verde
    'Ropa': '#F59E0B',       // Naranja
    'Accesorios': '#EF4444', // Rojo
    'Deportes': '#8B5CF6',   // Púrpura
    'Hogar': '#EC4899',      // Rosa
    'Electrónicos': '#14B8A6', // Turquesa
    'Otros': '#6B7280',      // Gris
  }

  return colorMap[categoryName] || '#3B82F6' // Color gris por defecto si la categoría no está en el mapa
}
