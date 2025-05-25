"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { MapPin, Clock, Package, TrendingUp } from "lucide-react"

interface GeneralStats {
  city: string
  state: string
  country: string
  totalOrders: number
  totalQuantity: number
  totalValue: number
  totalWarehouses: number
  totalProducts: number
}

interface CategoryStats {
  category: string
  totalOrders: number
  totalQuantity: number
  percentage: number
}

interface TemporalStats {
  month: string
  totalOrders: number
  totalQuantity: number
  percentage: number
}

interface ApiResponse {
  data: {
    generalStats: GeneralStats
    categoryStats: CategoryStats[]
    temporalStats: TemporalStats[]
  }
}

const cities = [
  { id: "Bogotá", name: "Bogotá, D.C." },
  { id: "Medellín", name: "Medellín" },
  { id: "Cali", name: "Cali" },
  { id: "Barranquilla", name: "Barranquilla" }
]

export function WarehousesByCity() {
  const [selectedCity, setSelectedCity] = useState("Bogotá")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiResponse | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/destinations/${selectedCity}/stats?startDate=2024-01-01&endDate=2024-01-31&limit=10&page=1`
        )
        const result: ApiResponse = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching city stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedCity])

  return (
    <div className="space-y-6">
      {/* Selector de Ciudad */}
      <div className="flex items-center gap-4">
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-64">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Seleccionar ciudad" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Métricas de la Ciudad */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data?.data.generalStats.totalWarehouses}</div>
                <div className="text-sm text-gray-600">Almacenes Activos</div>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data?.data.generalStats.totalProducts}</div>
                <div className="text-sm text-gray-600">Productos Totales</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data?.data.generalStats.totalOrders}</div>
                <div className="text-sm text-gray-600">Pedidos Totales</div>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${data?.data.generalStats.totalValue ? (data.data.generalStats.totalValue / 100).toFixed(0) : '0'}
                </div>
                <div className="text-sm text-gray-600">Valor Total</div>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Productos por categoría en {data?.data.generalStats.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Porcentaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Cargando...</TableCell>
                  </TableRow>
                ) : (
                  data?.data.categoryStats.map((category, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{category.category}</div>
                      </TableCell>
                      <TableCell>{category.totalOrders}</TableCell>
                      <TableCell>{category.totalQuantity}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${category.percentage}%` }}
                            ></div>
                          </div>
                          {category.percentage}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Gráfico de Volumen Temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Volumen Temporal</CardTitle>
            <CardDescription>Distribución de pedidos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.data.temporalStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                />
                <Bar dataKey="totalOrders" fill="#3B82F6" name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
