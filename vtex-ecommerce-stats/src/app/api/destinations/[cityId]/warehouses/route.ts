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
        const limit = parseInt(searchParams.get('limit') || '10');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Ajustamos el formato de las fechas para PostgreSQL
        const formattedStartDate = startDate ? `${startDate} 00:00:00` : null;
        const formattedEndDate = endDate ? `${endDate} 23:59:59` : null;

        const query = `
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
                w.warehouse_id,
                w.warehouse_name,
                w.address_street,
                w.address_city,
                w.address_state,
                w.address_country,
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
            JOIN warehouses w ON oi.warehouse_id = w.warehouse_id
            JOIN normalized_cities nc ON oi.destination_id = nc.destination_id
            WHERE nc.normalized_city = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
            GROUP BY w.warehouse_id, w.warehouse_name, w.address_street, w.address_city, w.address_state, w.address_country
            ORDER BY total_orders DESC
            LIMIT $${formattedStartDate && formattedEndDate ? '4' : formattedStartDate || formattedEndDate ? '3' : '2'} 
            OFFSET $${formattedStartDate && formattedEndDate ? '5' : formattedStartDate || formattedEndDate ? '4' : '3'}
        `;

        const countQuery = `
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
            SELECT COUNT(DISTINCT w.warehouse_id)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN warehouses w ON oi.warehouse_id = w.warehouse_id
            JOIN normalized_cities nc ON oi.destination_id = nc.destination_id
            WHERE nc.normalized_city = $1
            ${formattedStartDate ? ' AND o.invoiced_date >= $2::timestamp' : ''}
            ${formattedEndDate ? ` AND o.invoiced_date <= $${formattedStartDate ? '3' : '2'}::timestamp` : ''}
        `;

        // Query para ver los valores en la base de datos
        const debugQuery = `
            SELECT DISTINCT d.city, 
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
            ORDER BY d.city;
        `;

        const queryParams = [
            normalizedCityId,
            ...(formattedStartDate ? [formattedStartDate] : []),
            ...(formattedEndDate ? [formattedEndDate] : []),
            limit,
            offset
        ];

        const client = await pool.connect();
        try {
            // Ejecutar query de debug primero
            const debugResult = await client.query(debugQuery);
            console.log('Valores de ciudades en la base de datos:');
            debugResult.rows.forEach(row => {
                console.log(`Original: "${row.city}" -> Normalizado: "${row.normalized_city}"`);
            });

            const [result, countResult] = await Promise.all([
                client.query(query, queryParams),
                client.query(countQuery, [normalizedCityId, ...(formattedStartDate ? [formattedStartDate] : []), ...(formattedEndDate ? [formattedEndDate] : [])])
            ]);

            console.log('Query params:', queryParams);
            console.log('Resultados encontrados:', result.rows.length);

            const totalItems = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalItems / limit);

            return NextResponse.json({
                data: result.rows.map(row => ({
                    warehouseId: row.warehouse_id,
                    warehouseName: row.warehouse_name,
                    address: {
                        street: row.address_street,
                        city: row.address_city,
                        state: row.address_state,
                        country: row.address_country
                    },
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
        console.error('Error al obtener almacenes de la ciudad:', error);
        return NextResponse.json(
            { error: 'Error al obtener almacenes de la ciudad' },
            { status: 500 }
        );
    }
} 