import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        const { productId } = await params;
        
        if (!productId) {
            return NextResponse.json(
                { error: 'ID del producto es requerido' },
                { status: 400 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Ajustamos el formato de las fechas para PostgreSQL
        const formattedStartDate = startDate ? `${startDate} 00:00:00` : null;
        const formattedEndDate = endDate ? `${endDate} 23:59:59` : null;

        // Consulta para estadísticas generales del producto
        const generalStatsQuery = `
            SELECT 
                p.name,
                p.brand_name,
                p.category_name,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value,
                AVG(oi.unit_price) as avg_price,
                COUNT(DISTINCT d.city) as total_cities,
                COUNT(DISTINCT oi.warehouse_id) as total_warehouses
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            LEFT JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE oi.product_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY p.name, p.brand_name, p.category_name
        `;

        // Consulta para distribución por almacén
        const warehouseStatsQuery = `
            SELECT 
                w.warehouse_id,
                w.warehouse_name,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                ROUND(COUNT(DISTINCT o.order_id)::numeric / 
                    (SELECT COUNT(DISTINCT o2.order_id) 
                     FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     WHERE oi2.product_id = $1
                     ${formattedStartDate ? ' AND o2.invoiced_date >= $2::timestamp' : ''}
                     ${formattedEndDate ? ` AND o2.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN warehouses w ON oi.warehouse_id = w.warehouse_id
            WHERE oi.product_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY w.warehouse_id, w.warehouse_name
            ORDER BY total_orders DESC
        `;

        // Consulta para distribución temporal
        const temporalStatsQuery = `
            SELECT 
                DATE_TRUNC('month', o.invoiced_date) as month,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                ROUND(COUNT(DISTINCT o.order_id)::numeric / 
                    (SELECT COUNT(DISTINCT o2.order_id) 
                     FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     WHERE oi2.product_id = $1
                     ${formattedStartDate ? ' AND o2.invoiced_date >= $2::timestamp' : ''}
                     ${formattedEndDate ? ` AND o2.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE oi.product_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY DATE_TRUNC('month', o.invoiced_date)
            ORDER BY month DESC
        `;

        const queryParams = [
            productId,
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : [])
        ];

        const client = await pool.connect();
        try {
            const [generalStats, warehouseStats, temporalStats] = await Promise.all([
                client.query(generalStatsQuery, queryParams),
                client.query(warehouseStatsQuery, queryParams),
                client.query(temporalStatsQuery, queryParams)
            ]);

            return NextResponse.json({
                data: {
                    generalStats: generalStats.rows[0] ? {
                        name: generalStats.rows[0].name,
                        brandName: generalStats.rows[0].brand_name,
                        categoryName: generalStats.rows[0].category_name,
                        totalOrders: parseInt(generalStats.rows[0].total_orders),
                        totalQuantity: parseInt(generalStats.rows[0].total_quantity),
                        totalValue: parseFloat(generalStats.rows[0].total_value),
                        avgPrice: parseFloat(generalStats.rows[0].avg_price),
                        totalCities: parseInt(generalStats.rows[0].total_cities),
                        totalWarehouses: parseInt(generalStats.rows[0].total_warehouses)
                    } : null,
                    warehouseStats: warehouseStats.rows.map(row => ({
                        warehouseId: row.warehouse_id,
                        warehouseName: row.warehouse_name,
                        totalOrders: parseInt(row.total_orders),
                        totalQuantity: parseInt(row.total_quantity),
                        percentage: parseFloat(row.percentage)
                    })),
                    temporalStats: temporalStats.rows.map(row => ({
                        month: row.month,
                        totalOrders: parseInt(row.total_orders),
                        totalQuantity: parseInt(row.total_quantity),
                        percentage: parseFloat(row.percentage)
                    }))
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener estadísticas de distribución del producto:', error);
        return NextResponse.json(
            { error: 'Error al obtener estadísticas de distribución del producto' },
            { status: 500 }
        );
    }
} 