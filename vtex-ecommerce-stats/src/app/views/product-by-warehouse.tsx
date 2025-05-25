"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Download, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import * as XLSX from 'xlsx'

interface Product {
  product_id: string
  name: string
  brand_name: string
  category_name: string
  quantity: number
  unit_price: string
  invoiced_date: string
  destination_city: string
  destination_state: string
  destination_country: string
}

interface ApiResponse {
  data: Product[]
  pagination: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
  }
}

export function ProductsByWarehouse() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("5104_GRAN_ESTACION")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  const warehouses = [
    { id: "5104_GRAN_ESTACION", name: "5104 GRAN ESTACION" }
  ]

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const startDate = "2024-01-01"
        const endDate = "2024-01-31"

        const response = await fetch(
          `/api/warehouses/${selectedWarehouse}/products?startDate=${startDate}&endDate=${endDate}&limit=${itemsPerPage}&page=${currentPage}`
        )
        const data: ApiResponse = await response.json()
        setProducts(data.data)
        console.log('data', data)
        setTotalItems(data.pagination.totalItems)
        setTotalPages(data.pagination.totalPages)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [selectedWarehouse, currentPage])

  console.log('products', products)
  // Calcular métricas
  const totalProducts = products.length
  const totalValue = products.reduce((sum, product) => sum + (parseFloat(product.unit_price) * product.quantity), 0)
  const lowStockProducts = products.filter(p => p.quantity < 1).length

  // Preparar datos para el gráfico
  const chartData = products.reduce((acc, product) => {
    const existingCategory = acc.find(item => item.category === product.category_name)
    if (existingCategory) {
      existingCategory.cantidad += product.quantity
      existingCategory.valor += parseFloat(product.unit_price) * product.quantity
    } else {
      acc.push({
        category: product.category_name,
        cantidad: product.quantity,
        valor: parseFloat(product.unit_price) * product.quantity
      })
    }
    return acc
  }, [] as { category: string; cantidad: number; valor: number }[])

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const exportToExcel = async () => {
    try {
      // Obtener todos los datos sin paginación
      const response = await fetch(
        `/api/warehouses/${selectedWarehouse}/products?startDate=2024-01-01&endDate=2024-01-31&limit=1000&page=1`
      )
      const data: ApiResponse = await response.json()

      // Preparar los datos para el Excel
      const excelData = data.data.map(product => ({
        'ID Producto': product.product_id,
        'Nombre Producto': product.name,
        'Marca': product.brand_name,
        'Categoría': product.category_name,
        'Cantidad': product.quantity,
        'Precio Unitario': `$${(parseFloat(product.unit_price) / 100).toFixed(0)}`,
        'Valor Total': `$${(parseFloat(product.unit_price) * product.quantity / 100).toFixed(0)}`,
        'Fecha Facturación': new Date(product.invoiced_date).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        'Ciudad Destino': product.destination_city,
        'Estado Destino': product.destination_state,
        'País Destino': product.destination_country,
        'Estado Stock': product.quantity === 0 ? "Sin Stock" :
                       product.quantity < 5 ? "Stock Bajo" :
                       "En Stock"
      }))

      // Crear el libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')

      // Generar el archivo y descargarlo
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `productos_almacen_${selectedWarehouse}_${new Date().toISOString().split('T')[0]}.xlsx`
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
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Seleccionar almacén" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Productos
        </Button>
      </div>

      {/* Métricas del Almacén */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalProducts}</div>
            <div className="text-sm text-gray-600">Total Productos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${(totalValue / 100).toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Valor Inventario</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {products.filter(p => p.quantity > 0 && p.quantity < 3).length}
            </div>
            <div className="text-sm text-gray-600">Productos con Stock Bajo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{lowStockProducts}</div>
            <div className="text-sm text-gray-600">Sin Stock</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos en Almacén</CardTitle>
            <CardDescription>Lista de productos y su estado actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Cargando...</TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => (
                        <TableRow key={product.product_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.brand_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{product.category_name}</TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>
                            <Badge className={
                              product.quantity === 0 ? "bg-red-100 text-red-800" :
                              product.quantity < 5 ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            }>
                              {product.quantity === 0 ? "Sin Stock" :
                               product.quantity < 5 ? "Stock Bajo" :
                               "En Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} productos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Distribución */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Cantidad de productos por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
