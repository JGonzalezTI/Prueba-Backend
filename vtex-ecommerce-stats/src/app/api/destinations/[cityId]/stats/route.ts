import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { cityId: string } }
) {
    try {
        const { cityId } = await params;
        
        if (!cityId) {
            return NextResponse.json(
                { error: 'ID de la ciudad es requerido' },
                { status: 400 }
            );
        }

        console.log('Ciudad recibida en params:', cityId);

        // Función para normalizar el nombre de la ciudad
        const normalizeCityName = (city: string) => {
            return city
                // Convertir a minúsculas
                .toLowerCase()
                // Eliminar acentos
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                // Eliminar caracteres especiales excepto letras
                .replace(/[^a-z]/g, '')
                // Eliminar espacios
                .replace(/\s+/g, '')
                .trim();
        };

        const normalizedCityId = normalizeCityName(cityId);
        console.log('Ciudad normalizada:', normalizedCityId);

        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Ajustamos el formato de las fechas para PostgreSQL
        const formattedStartDate = startDate ? `${startDate} 00:00:00` : null;
        const formattedEndDate = endDate ? `${endDate} 23:59:59` : null;

        // Consulta para estadísticas generales de la ciudad
        const generalStatsQuery = `
            WITH normalized_cities AS (
                SELECT 
                    d.destination_id,
                    d.city,
                    regexp_replace(
                        lower(
                            regexp_replace(
                                translate(
                                    split_part(d.city, ',', 1),
                                    'áéíóúÁÉÍÓÚñÑ',
                                    'aeiouAEIOUnN'
                                ),
                                '[^a-zA-Z]', '', 'g'
                            )
                        ),
                        '\s+', '', 'g'
                    ) as normalized_city
                FROM destinations d
            )
            SELECT 
                d.city,
                d.state,
                d.country,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value,
                COUNT(DISTINCT oi.warehouse_id) as total_warehouses,
                COUNT(DISTINCT oi.product_id) as total_products
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN normalized_cities nc ON oi.destination_id = nc.destination_id
            JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE nc.normalized_city = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY d.city, d.state, d.country
        `;

        // Consulta para top categorías
        const categoryStatsQuery = `
            WITH normalized_cities AS (
                SELECT 
                    d.destination_id,
                    d.city,
                    regexp_replace(
                        lower(
                            regexp_replace(
                                translate(
                                    split_part(d.city, ',', 1),
                                    'áéíóúÁÉÍÓÚñÑ',
                                    'aeiouAEIOUnN'
                                ),
                                '[^a-zA-Z]', '', 'g'
                            )
                        ),
                        '\s+', '', 'g'
                    ) as normalized_city
                FROM destinations d
            )
            SELECT 
                p.category_name,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                ROUND(COUNT(DISTINCT o.order_id)::numeric / 
                    (SELECT COUNT(DISTINCT o2.order_id) 
                     FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     JOIN normalized_cities nc2 ON oi2.destination_id = nc2.destination_id 
                     WHERE nc2.normalized_city = $1
                     ${formattedStartDate ? ' AND o2.invoiced_date >= $2::timestamp' : ''}
                     ${formattedEndDate ? ` AND o2.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN normalized_cities nc ON oi.destination_id = nc.destination_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE nc.normalized_city = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY p.category_name
            ORDER BY total_orders DESC
            LIMIT 5
        `;

        // Consulta para distribución temporal
        const temporalStatsQuery = `
            WITH normalized_cities AS (
                SELECT 
                    d.destination_id,
                    d.city,
                    regexp_replace(
                        lower(
                            regexp_replace(
                                translate(
                                    split_part(d.city, ',', 1),
                                    'áéíóúÁÉÍÓÚñÑ',
                                    'aeiouAEIOUnN'
                                ),
                                '[^a-zA-Z]', '', 'g'
                            )
                        ),
                        '\s+', '', 'g'
                    ) as normalized_city
                FROM destinations d
            )
            SELECT 
                DATE_TRUNC('month', o.invoiced_date) as month,
                COUNT(DISTINCT o.order_id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                ROUND(COUNT(DISTINCT o.order_id)::numeric / 
                    (SELECT COUNT(DISTINCT o2.order_id) 
                     FROM order_items oi2 
                     JOIN orders o2 ON oi2.order_id = o2.order_id 
                     JOIN normalized_cities nc2 ON oi2.destination_id = nc2.destination_id 
                     WHERE nc2.normalized_city = $1
                     ${formattedStartDate ? ' AND o2.invoiced_date >= $2::timestamp' : ''}
                     ${formattedEndDate ? ` AND o2.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}) * 100, 2) as percentage
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN normalized_cities nc ON oi.destination_id = nc.destination_id
            WHERE nc.normalized_city = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY DATE_TRUNC('month', o.invoiced_date)
            ORDER BY month DESC
        `;

        const queryParams = [
            normalizedCityId,
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : [])
        ];

        const client = await pool.connect();
        try {
            const [generalStats, categoryStats, temporalStats] = await Promise.all([
                client.query(generalStatsQuery, queryParams),
                client.query(categoryStatsQuery, queryParams),
                client.query(temporalStatsQuery, queryParams)
            ]);

            return NextResponse.json({
                data: {
                    generalStats: generalStats.rows[0] ? {
                        city: generalStats.rows[0].city,
                        state: generalStats.rows[0].state,
                        country: generalStats.rows[0].country,
                        totalOrders: parseInt(generalStats.rows[0].total_orders),
                        totalQuantity: parseInt(generalStats.rows[0].total_quantity),
                        totalValue: parseFloat(generalStats.rows[0].total_value),
                        totalWarehouses: parseInt(generalStats.rows[0].total_warehouses),
                        totalProducts: parseInt(generalStats.rows[0].total_products)
                    } : null,
                    categoryStats: categoryStats.rows.map(row => ({
                        category: row.category_name,
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
        console.error('Error al obtener estadísticas de la ciudad:', error);
        return NextResponse.json(
            { error: 'Error al obtener estadísticas de la ciudad' },
            { status: 500 }
        );
    }
} 