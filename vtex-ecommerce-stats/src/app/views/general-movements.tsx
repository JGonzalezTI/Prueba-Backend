"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Filter, Search, RefreshCw } from "lucide-react"
import { DatePickerWithRange } from "@/app/views/date-picker-range"
import * as XLSX from 'xlsx'

interface Product {
  id: string
  name: string
  category: string
}

interface Warehouse {
  id: string
  name: string
}

interface Destination {
  city: string
  state: string
  country: string
}

interface Movement {
  quantity: number
  value: number
  date: string
  status: string
}

interface MovementData {
  product: Product
  warehouse: Warehouse
  destination: Destination
  movement: Movement
}

interface ApiResponse {
  data: MovementData[]
  pagination: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
  }
}

const statusOptions = {
  invoiced: "Facturado",
  pending: "Pendiente",
  cancelled: "Cancelado"
}

export function GeneralMovements() {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/movements?startDate=2024-01-01&endDate=2024-01-31&productId=125582&limit=20&page=${currentPage}`
        )
        const result: ApiResponse = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching movements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentPage])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "invoiced":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredMovements = data?.data.filter((movement) => {
    const matchesSearch =
      movement.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }) || []

  const exportToExcel = async () => {
    try {
      // Obtener todos los datos sin paginación
      const response = await fetch(
        `/api/movements?startDate=2024-01-01&endDate=2024-01-31&productId=125582&limit=1000&page=1`
      )
      const result: ApiResponse = await response.json()

      // Preparar los datos para el Excel
      const excelData = result.data.map(movement => ({
        'ID Producto': movement.product.id,
        'Nombre Producto': movement.product.name,
        'Categoría': movement.product.category,
        'ID Almacén': movement.warehouse.id,
        'Nombre Almacén': movement.warehouse.name,
        'Ciudad Destino': movement.destination.city,
        'Estado Destino': movement.destination.state,
        'País Destino': movement.destination.country,
        'Cantidad': movement.movement.quantity,
        'Valor': `$${(movement.movement.value / 100).toFixed(0)}`,
        'Fecha': new Date(movement.movement.date).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        'Estado': statusOptions[movement.movement.status as keyof typeof statusOptions]
      }))

      // Crear el libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos')

      // Generar el archivo y descargarlo
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `movimientos_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles Principales */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <DatePickerWithRange />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage(1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
        <Button onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Datos
        </Button>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros Avanzados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar movimientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {data?.data.filter(m => m.movement.status === 'invoiced').length || 0}
            </div>
            <div className="text-sm text-gray-600">Movimientos Facturados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {data?.data.filter(m => m.movement.status === 'pending').length || 0}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {data?.data.filter(m => m.movement.status === 'cancelled').length || 0}
            </div>
            <div className="text-sm text-gray-600">Cancelados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              ${data?.data.reduce((sum, m) => sum + (m.movement.value / 100), 0).toFixed(0) || '0'}
            </div>
            <div className="text-sm text-gray-600">Valor Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Generales</CardTitle>
          <CardDescription>
            Mostrando {filteredMovements.length} de {data?.pagination.totalItems || 0} movimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Cargando...</TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.product.name}</div>
                        <div className="text-sm text-gray-500">ID: {movement.product.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{movement.product.category}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.warehouse.name}</div>
                        <div className="text-sm text-gray-500">{movement.warehouse.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.destination.city}</div>
                        <div className="text-sm text-gray-500">{movement.destination.state}</div>
                      </div>
                    </TableCell>
                    <TableCell>{movement.movement.quantity}</TableCell>
                    <TableCell>${(movement.movement.value / 100).toFixed(0)}</TableCell>
                    <TableCell>
                      {new Date(movement.movement.date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(movement.movement.status)}>
                        {statusOptions[movement.movement.status as keyof typeof statusOptions]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
