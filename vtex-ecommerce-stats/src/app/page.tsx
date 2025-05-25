"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, TrendingUp, Package, MapPin, Clock } from "lucide-react"
import { MetricsSection } from "@/app/views/metrics-section"
import { ProductsByWarehouse } from "@/app/views/product-by-warehouse"
import { DestinationsByProduct } from "@/app/views/destinations-by-product"
import { WarehousesByCity } from "@/app/views/warehouses-by-city"
import { GeneralMovements } from "@/app/views/general-movements"
import './globals.css'

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("30d")
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Logístico</h1>
            <p className="text-gray-600">Gestión de inventario y distribución</p>
          </div>
          <div className="flex items-center gap-4">
           
            
          </div>
        </div>

        {/* Filtros Activos */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer">
                {filter}
                <button
                  className="ml-1 text-xs"
                  onClick={() => setActiveFilters((prev) => prev.filter((f) => f !== filter))}
                >
                  ×
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])}>
              Limpiar todo
            </Button>
          </div>
        )}

        {/* Métricas Generales */}
        <MetricsSection dateRange={dateRange} />

        {/* Sección de Reportes */}
        <Card>
          <CardHeader>
            <CardTitle>Reportes Detallados</CardTitle>
            <CardDescription>Análisis específicos por categoría y ubicación</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="products" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos por Almacén
                </TabsTrigger>
                <TabsTrigger value="destinations" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Destinos por Producto
                </TabsTrigger>
                <TabsTrigger value="warehouses" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Almacenes por Ciudad
                </TabsTrigger>
                <TabsTrigger value="movements" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Movimientos Generales
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                <ProductsByWarehouse />
              </TabsContent>

              <TabsContent value="destinations">
                <DestinationsByProduct />
              </TabsContent>

              <TabsContent value="warehouses">
                <WarehousesByCity />
              </TabsContent>

              <TabsContent value="movements">
                <GeneralMovements />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
