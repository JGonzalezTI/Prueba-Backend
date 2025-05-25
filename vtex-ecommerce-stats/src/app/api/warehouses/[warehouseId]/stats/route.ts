import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { warehouseId: string } }
) {
    try {
        const { warehouseId } = params;
        
        if (!warehouseId) {
            return NextResponse.json(
                { error: 'ID del almacén es requerido' },
                { status: 400 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // formato de las fechas para PostgreSQL
        const formattedStartDate = startDate ? `${startDate} 00:00:00` : null;
        const formattedEndDate = endDate ? `${endDate} 23:59:59` : null;

        // Consulta para estadísticas generales
        const generalStatsQuery = `
            SELECT 
                COUNT(DISTINCT o.order_id) as total_orders,
                COUNT(oi.product_id) as total_products,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value,
                AVG(oi.quantity) as avg_products_per_order
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE oi.warehouse_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
        `;

        // Consulta para estadísticas por categoría
        const categoryStatsQuery = `
            SELECT 
                p.category_name,
                COUNT(oi.product_id) as product_count,
                SUM(oi.quantity) as total_quantity,
                ROUND(COUNT(oi.product_id)::numeric / 
                    (SELECT COUNT(*) FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     WHERE oi2.warehouse_id = $1
                     ${formattedStartDate ? ' AND o2.invoiced_date >= $2::timestamp' : ''}
                     ${formattedEndDate ? ` AND o2.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE oi.warehouse_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY p.category_name
            ORDER BY product_count DESC
        `;

        // Consulta para top ciudades
        const topCitiesQuery = `
            SELECT 
                d.city,
                COUNT(DISTINCT o.order_id) as order_count,
                ROUND(COUNT(DISTINCT o.order_id)::numeric / 
                    (SELECT COUNT(DISTINCT o2.order_id) FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     WHERE oi2.warehouse_id = $1
                     ${formattedStartDate ? ' AND o2.invoiced_date >= $2::timestamp' : ''}
                     ${formattedEndDate ? ` AND o2.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE oi.warehouse_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY d.city
            ORDER BY order_count DESC
            LIMIT 5
        `;

        const queryParams = [
            warehouseId,
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : [])
        ];

        const client = await pool.connect();
        try {
            const [generalStats, categoryStats, topCities] = await Promise.all([
                client.query(generalStatsQuery, queryParams),
                client.query(categoryStatsQuery, queryParams),
                client.query(topCitiesQuery, queryParams)
            ]);

            return NextResponse.json({
                data: {
                    generalStats: {
                        totalOrders: parseInt(generalStats.rows[0].total_orders),
                        totalProducts: parseInt(generalStats.rows[0].total_products),
                        totalQuantity: parseInt(generalStats.rows[0].total_quantity),
                        totalValue: parseFloat(generalStats.rows[0].total_value),
                        avgProductsPerOrder: parseFloat(generalStats.rows[0].avg_products_per_order)
                    },
                    categoryStats: categoryStats.rows.map(row => ({
                        category: row.category_name,
                        productCount: parseInt(row.product_count),
                        totalQuantity: parseInt(row.total_quantity),
                        percentage: parseFloat(row.percentage)
                    })),
                    topCities: topCities.rows.map(row => ({
                        city: row.city,
                        orderCount: parseInt(row.order_count),
                        percentage: parseFloat(row.percentage)
                    }))
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener estadísticas del almacén:', error);
        return NextResponse.json(
            { error: 'Error al obtener estadísticas del almacén' },
            { status: 500 }
        );
    }
} 