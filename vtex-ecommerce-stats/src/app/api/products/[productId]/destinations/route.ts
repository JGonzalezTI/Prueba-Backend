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
        const limit = parseInt(searchParams.get('limit') || '10');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Ajustamos el formato de las fechas para PostgreSQL
        const formattedStartDate = startDate ? `${startDate} 00:00:00` : null;
        const formattedEndDate = endDate ? `${endDate} 23:59:59` : null;

        const query = `
            SELECT 
                d.city,
                d.state,
                d.country,
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
            JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE oi.product_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY d.city, d.state, d.country
            ORDER BY total_orders DESC
            LIMIT $${formattedStartDate && formattedEndDate ? '4' : formattedStartDate || formattedEndDate ? '3' : '2'} 
            OFFSET $${formattedStartDate && formattedEndDate ? '5' : formattedStartDate || formattedEndDate ? '4' : '3'}
        `;

        const countQuery = `
            SELECT COUNT(DISTINCT d.city)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE oi.product_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
        `;

        const queryParams = [
            productId,
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : []),
            limit,
            offset
        ];

        const client = await pool.connect();
        try {
            const [result, countResult] = await Promise.all([
                client.query(query, queryParams),
                client.query(countQuery, [productId, ...(formattedStartDate ? [formattedStartDate] : []), ...(formattedEndDate ? [formattedEndDate] : [])])
            ]);

            const totalItems = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalItems / limit);

            return NextResponse.json({
                data: result.rows.map(row => ({
                    city: row.city,
                    state: row.state,
                    country: row.country,
                    totalOrders: parseInt(row.total_orders),
                    totalQuantity: parseInt(row.total_quantity),
                    percentage: parseFloat(row.percentage)
                })),
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener destinos del producto:', error);
        return NextResponse.json(
            { error: 'Error al obtener destinos del producto' },
            { status: 500 }
        );
    }
} 