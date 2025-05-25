// app/api/warehouses/[warehouseId]/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { warehouseId: string } }
) {
    try {
        // Acceso asíncrono a params según la documentación
        const { warehouseId } = await params;
        
        if (!warehouseId) {
            return NextResponse.json(
                { error: 'ID del almacén es requerido' },
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
                p.product_id,
                p.name,
                p.brand_name,
                p.category_name,
                oi.quantity,
                oi.unit_price,
                o.invoiced_date,
                d.city as destination_city,
                d.state as destination_state,
                d.country as destination_country
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            LEFT JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE oi.warehouse_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            ORDER BY o.invoiced_date DESC
            LIMIT $${formattedStartDate && formattedEndDate ? '4' : formattedStartDate || formattedEndDate ? '3' : '2'} 
            OFFSET $${formattedStartDate && formattedEndDate ? '5' : formattedStartDate || formattedEndDate ? '4' : '3'}
        `;

        const queryParams = [
            warehouseId,
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : []),
            limit,
            offset
        ];

        const countQuery = `
            SELECT COUNT(*)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE oi.warehouse_id = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
        `;

        console.log('Query:', query);
        console.log('Params:', queryParams);

        const client = await pool.connect();
        try {
            const [result, countResult] = await Promise.all([
                client.query(query, queryParams),
                client.query(countQuery, [warehouseId, ...(formattedStartDate ? [formattedStartDate] : []), ...(formattedEndDate ? [formattedEndDate] : [])])
            ]);

            const totalItems = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalItems / limit);

            return NextResponse.json({
                data: result.rows,
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
        console.error('Error al obtener productos del almacén:', error);
        return NextResponse.json(
            { error: 'Error al obtener productos del almacén' },
            { status: 500 }
        );
    }
}