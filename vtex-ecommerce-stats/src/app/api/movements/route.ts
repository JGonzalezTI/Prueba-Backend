import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        
        // Parámetros requeridos
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        
        // Parámetros opcionales
        const productId = searchParams.get('productId');
        const warehouseId = searchParams.get('warehouseId');
        const cityId = searchParams.get('cityId');
        const limit = parseInt(searchParams.get('limit') || '10');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Validar parámetros requeridos
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate y endDate son requeridos' },
                { status: 400 }
            );
        }

        // Ajustar formato de fechas para PostgreSQL
        const formattedStartDate = `${startDate} 00:00:00`;
        const formattedEndDate = `${endDate} 23:59:59`;

        // Construir la consulta base
        let query = `
            SELECT 
                p.product_id,
                p.name as product_name,
                p.category_name,
                w.warehouse_id,
                w.warehouse_name,
                d.city as destination_city,
                d.state as destination_state,
                d.country as destination_country,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.unit_price) as total_value,
                o.invoiced_date,
                o.status
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            JOIN warehouses w ON oi.warehouse_id = w.warehouse_id
            JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE o.invoiced_date >= $1::timestamp 
            AND o.invoiced_date <= $2::timestamp
        `;

        // Agregar filtros opcionales
        const queryParams = [formattedStartDate, formattedEndDate];
        let paramIndex = 3;

        if (productId) {
            query += ` AND p.product_id = $${paramIndex}`;
            queryParams.push(productId);
            paramIndex++;
        }

        if (warehouseId) {
            query += ` AND w.warehouse_id = $${paramIndex}`;
            queryParams.push(warehouseId);
            paramIndex++;
        }

        if (cityId) {
            query += ` AND d.city = $${paramIndex}`;
            queryParams.push(cityId);
            paramIndex++;
        }

        // Agregar agrupación y ordenamiento
        query += `
            GROUP BY 
                p.product_id,
                p.name,
                p.category_name,
                w.warehouse_id,
                w.warehouse_name,
                d.city,
                d.state,
                d.country,
                o.invoiced_date,
                o.status
            ORDER BY o.invoiced_date DESC
            LIMIT $${paramIndex} 
            OFFSET $${paramIndex + 1}
        `;
        queryParams.push(limit as any, offset as any);

        // Consulta para el total de registros
        const countQuery = `
            SELECT COUNT(DISTINCT (p.product_id, w.warehouse_id, d.city))
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            JOIN warehouses w ON oi.warehouse_id = w.warehouse_id
            JOIN destinations d ON oi.destination_id = d.destination_id
            WHERE o.invoiced_date >= $1::timestamp 
            AND o.invoiced_date <= $2::timestamp
            ${productId ? ' AND p.product_id = $3' : ''}
            ${warehouseId ? ` AND w.warehouse_id = $${productId ? '4' : '3'}` : ''}
            ${cityId ? ` AND d.city = $${productId && warehouseId ? '5' : productId || warehouseId ? '4' : '3'}` : ''}
        `;

        const client = await pool.connect();
        try {
            const [result, countResult] = await Promise.all([
                client.query(query, queryParams),
                client.query(countQuery, [
                    formattedStartDate,
                    formattedEndDate,
                    ...(productId ? [productId] : []),
                    ...(warehouseId ? [warehouseId] : []),
                    ...(cityId ? [cityId] : [])
                ])
            ]);

            const totalItems = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalItems / limit);

            return NextResponse.json({
                data: result.rows.map(row => ({
                    product: {
                        id: row.product_id,
                        name: row.product_name,
                        category: row.category_name
                    },
                    warehouse: {
                        id: row.warehouse_id,
                        name: row.warehouse_name
                    },
                    destination: {
                        city: row.destination_city,
                        state: row.destination_state,
                        country: row.destination_country
                    },
                    movement: {
                        quantity: parseInt(row.total_quantity),
                        value: parseFloat(row.total_value),
                        date: row.invoiced_date,
                        status: row.status
                    }
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
        console.error('Error al obtener movimientos:', error);
        return NextResponse.json(
            { error: 'Error al obtener movimientos' },
            { status: 500 }
        );
    }
} 