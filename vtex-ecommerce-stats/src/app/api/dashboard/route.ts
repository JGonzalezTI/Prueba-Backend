import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';


export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Ajustar formato de fechas para PostgreSQL
        const formattedStartDate = startDate ? `${startDate} 00:00:00` : null;
        const formattedEndDate = endDate ? `${endDate} 23:59:59` : null;

        // Consulta para métricas generales
        const generalMetricsQuery = `
            SELECT 
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_products,
                SUM(oi.quantity * oi.unit_price) as total_value,
                COUNT(DISTINCT oi.warehouse_id) as total_warehouses,
                COUNT(DISTINCT oi.destination_id) as total_cities
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            ${formattedStartDate ? ' WHERE o.invoiced_date >= $1::timestamp' : ''}
            ${formattedEndDate ? ` ${formattedStartDate ? 'AND' : 'WHERE'} o.invoiced_date <= $${formattedStartDate ? '2' : '1'}::timestamp` : ''}
        `;

        // Consulta para top productos
        const topProductsQuery = `
            SELECT 
                p.product_id,
                p.name,
                p.category_name,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            ${formattedStartDate ? ' WHERE o.invoiced_date >= $1::timestamp' : ''}
            ${formattedEndDate ? ` ${formattedStartDate ? 'AND' : 'WHERE'} o.invoiced_date <= $${formattedStartDate ? '2' : '1'}::timestamp` : ''}
            GROUP BY p.product_id, p.name, p.category_name
            ORDER BY total_quantity DESC
            LIMIT 5
        `;

        // Consulta para top ciudades
        const topCitiesQuery = `
            SELECT 
                d.city,
                d.state,
                d.country,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value
            FROM order_items oi
            JOIN destinations d ON oi.destination_id = d.destination_id
            JOIN orders o ON oi.order_id = o.order_id
            ${formattedStartDate ? ' WHERE o.invoiced_date >= $1::timestamp' : ''}
            ${formattedEndDate ? ` ${formattedStartDate ? 'AND' : 'WHERE'} o.invoiced_date <= $${formattedStartDate ? '2' : '1'}::timestamp` : ''}
            GROUP BY d.city, d.state, d.country
            ORDER BY total_orders DESC
            LIMIT 5
        `;

        // Consulta para distribución por categoría
        const categoryDistributionQuery = `
            SELECT 
                p.category_name,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                ROUND(COUNT(DISTINCT o.order_id)::numeric / 
                    (SELECT COUNT(DISTINCT o2.order_id) 
                     FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     ${formattedStartDate ? ' WHERE o2.invoiced_date >= $1::timestamp' : ''}
                     ${formattedEndDate ? ` ${formattedStartDate ? 'AND' : 'WHERE'} o2.invoiced_date <= $${formattedStartDate ? '2' : '1'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            ${formattedStartDate ? ' WHERE o.invoiced_date >= $1::timestamp' : ''}
            ${formattedEndDate ? ` ${formattedStartDate ? 'AND' : 'WHERE'} o.invoiced_date <= $${formattedStartDate ? '2' : '1'}::timestamp` : ''}
            GROUP BY p.category_name
            ORDER BY total_orders DESC
        `;

        // Consulta para tendencias temporales
        const temporalTrendsQuery = `
            SELECT 
                DATE_TRUNC('month', o.invoiced_date) as month,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            ${formattedStartDate ? ' WHERE o.invoiced_date >= $1::timestamp' : ''}
            ${formattedEndDate ? ` ${formattedStartDate ? 'AND' : 'WHERE'} o.invoiced_date <= $${formattedStartDate ? '2' : '1'}::timestamp` : ''}
            GROUP BY DATE_TRUNC('month', o.invoiced_date)
            ORDER BY month DESC
        `;

        const queryParams = [
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : [])
        ];

        const client = await pool.connect();
        try {
            const [
                generalMetrics,
                topProducts,
                topCities,
                categoryDistribution,
                temporalTrends
            ] = await Promise.all([
                client.query(generalMetricsQuery, queryParams),
                client.query(topProductsQuery, queryParams),
                client.query(topCitiesQuery, queryParams),
                client.query(categoryDistributionQuery, queryParams),
                client.query(temporalTrendsQuery, queryParams)
            ]);

            return NextResponse.json({
                data: {
                    generalMetrics: generalMetrics.rows[0] ? {
                        totalOrders: parseInt(generalMetrics.rows[0].total_orders),
                        totalProducts: parseInt(generalMetrics.rows[0].total_products),
                        totalValue: parseFloat(generalMetrics.rows[0].total_value),
                        totalWarehouses: parseInt(generalMetrics.rows[0].total_warehouses),
                        totalCities: parseInt(generalMetrics.rows[0].total_cities)
                    } : null,
                    topProducts: topProducts.rows.map(row => ({
                        id: row.product_id,
                        name: row.name,
                        category: row.category_name,
                        totalOrders: parseInt(row.total_orders),
                        totalQuantity: parseInt(row.total_quantity),
                        totalValue: parseFloat(row.total_value)
                    })),
                    topCities: topCities.rows.map(row => ({
                        city: row.city,
                        state: row.state,
                        country: row.country,
                        totalOrders: parseInt(row.total_orders),
                        totalQuantity: parseInt(row.total_quantity),
                        totalValue: parseFloat(row.total_value)
                    })),
                    categoryDistribution: categoryDistribution.rows.map(row => ({
                        category: row.category_name,
                        totalOrders: parseInt(row.total_orders),
                        totalQuantity: parseInt(row.total_quantity),
                        percentage: parseFloat(row.percentage)
                    })),
                    temporalTrends: temporalTrends.rows.map(row => ({
                        month: row.month,
                        totalOrders: parseInt(row.total_orders),
                        totalQuantity: parseInt(row.total_quantity),
                        totalValue: parseFloat(row.total_value)
                    }))
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error);
        return NextResponse.json(
            { error: 'Error al obtener métricas del dashboard' },
            { status: 500 }
        );
    }
} 