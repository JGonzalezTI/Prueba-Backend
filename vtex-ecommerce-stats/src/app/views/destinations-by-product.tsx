"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, TrendingUp, Package } from "lucide-react"

interface GeneralStats {
  name: string
  brandName: string
  categoryName: string
  totalOrders: number
  totalQuantity: number
  totalValue: number
  avgPrice: number
  totalCities: number
  totalWarehouses: number
}

interface WarehouseStats {
  warehouseId: string
  warehouseName: string
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
    warehouseStats: WarehouseStats[]
    temporalStats: TemporalStats[]
  }
}

export function DestinationsByProduct() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("125582")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiResponse | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/products/${selectedProduct}/distribution-stats?startDate=2024-01-01&endDate=2024-01-31`
        )
        const result: ApiResponse = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching product distribution:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedProduct])

  const filteredWarehouses = data?.data.warehouseStats.filter(
    (warehouse) =>
      warehouse.warehouseName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Buscador de Almacenes */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar almacén..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Información General del Producto */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Producto</CardTitle>
          <CardDescription>Detalles generales y estadísticas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="font-medium text-sm mb-2">{data?.data.generalStats.name}</div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{data?.data.generalStats.brandName}</span>
                  <span>{data?.data.generalStats.categoryName}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estadísticas Generales */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas Generales</CardTitle>
            <CardDescription>Resumen de distribución</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Pedidos</span>
              <span className="font-bold">{data?.data.generalStats.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cantidad Total</span>
              <span className="font-bold">{data?.data.generalStats.totalQuantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Valor Total</span>
              <span className="font-bold">
                ${data?.data.generalStats.totalValue ? (data.data.generalStats.totalValue / 100).toFixed(0) : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ciudades Atendidas</span>
              <span className="font-bold">{data?.data.generalStats.totalCities}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Almacenes</span>
              <span className="font-bold">{data?.data.generalStats.totalWarehouses}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Almacenes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribución por Almacén</CardTitle>
            <CardDescription>Estadísticas de distribución por almacén</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Almacén</TableHead>
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
                  filteredWarehouses.map((warehouse, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{warehouse.warehouseName}</div>
                          <div className="text-sm text-gray-500">{warehouse.warehouseId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{warehouse.totalOrders}</TableCell>
                      <TableCell>{warehouse.totalQuantity}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${warehouse.percentage}%` }}
                            ></div>
                          </div>
                          {warehouse.percentage}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
