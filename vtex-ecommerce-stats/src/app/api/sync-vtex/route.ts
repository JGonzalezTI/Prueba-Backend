// src/app/api/sync/vtex/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/db';
//import listOrders from '@/app/lib/harcodedListOrders.json';
//import orderDetail from '@/app/lib/harcodedorderDetail.json';
import dotenv from 'dotenv';
dotenv.config();

export async function POST(request: NextRequest) {
    try {
        // Usar los datos hardcodeados en lugar de consultar VTEX
        const vtexOrders = await fetchVTEXOrders();
      
        // Procesar y guardar cada orden
        for (const order of vtexOrders) {
            await processOrder(order);
        }

        return NextResponse.json({
            message: 'Sincronización completada',
            totalOrders: vtexOrders.length
        });

    } catch (error) {
        console.error('Error en sincronización:', error);
        return NextResponse.json(
            { error: 'Error en la sincronización' },
            { status: 500 }
        );
    }
}

async function fetchVTEXOrders() {

    // Implementación temporal usando datos hardcodeados
    /*try { 
        const allOrders = [orderDetail]; // Usamos el detalle de la orden hardcodeado
        console.log(`🎉 Proceso completado. Total de órdenes procesadas: ${allOrders.length}`);
        return allOrders;
    } catch (error) {
        console.error('🚨 Error general en fetchVTEXOrders:', error);
        throw new Error('Error al sincronizar órdenes de VTEX');
    }*/

    // Implementación original con llamadas a la API de VTEX
    const VTEX_API_URL = process.env.VTEX_API_URL;
    const VTEX_APP_TOKEN = process.env.VTEX_APP_TOKEN;
    const PER_PAGE = 100;
    let currentPage = 1;
    let allOrders: any[] = [];

    try {
        while (true) {
            try {
                // Obtener la lista de órdenes
                const response = await fetch(
                    `${VTEX_API_URL}/api/oms/pvt/orders?page=${currentPage}&per_page=${PER_PAGE}&f_invoicedDate=invoicedDate%3A%5B2024-01-01T00%3A00%3A00.000Z%20TO%202024-01-31T23%3A59%3A59.999Z%5D&f_status=invoiced`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'VtexIdclientAutCookie': VTEX_APP_TOKEN!
                        }
                    }
                );

                if (!response.ok) {
                    console.error('❌ Error al obtener órdenes de VTEX en página', currentPage);
                    throw new Error(`Error al obtener órdenes de VTEX en página ${currentPage}`);
                }

                const data = await response.json();
                
                // Si no hay lista o está vacía, terminamos
                if (!data.list || data.list.length === 0) {
                    console.log('✅ No hay más órdenes para procesar');
                    break;
                }

                console.log(`📦 Procesando página ${currentPage} con ${data.list.length} órdenes`);

                // Para cada orden en la lista, obtenemos sus detalles completos
                for (const order of data.list) {
                    try {
                        const orderDetailResponse = await fetch(
                            `${VTEX_API_URL}/api/oms/pvt/orders/${order.orderId}`,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'VtexIdclientAutCookie': VTEX_APP_TOKEN!
                                }
                            }
                        );

                        if (!orderDetailResponse.ok) {
                            console.error(`⚠️ Error al obtener detalles de la orden ${order.orderId}`);
                            continue;
                        }

                        const orderDetail = await orderDetailResponse.json();
                        allOrders.push(orderDetail);
                        console.log(`✅ Orden ${order.orderId} procesada correctamente`);

                        // Pequeño delay para no sobrecargar la API
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (orderError) {
                        console.error(`❌ Error procesando orden ${order.orderId}:`, orderError);
                        continue; // Continuamos con la siguiente orden
                    }
                }

                currentPage++;
            } catch (pageError) {
                console.error(`❌ Error en página ${currentPage}:`, pageError);
                throw pageError; // Re-lanzamos el error para manejarlo en el catch exterior
            }
        }

        console.log(`🎉 Proceso completado. Total de órdenes procesadas: ${allOrders.length}`);
        return allOrders;

    } catch (error) {
        console.error('🚨 Error general en fetchVTEXOrders:', (error as any).data.message );
        throw new Error('Error al sincronizar órdenes de VTEX');
    }
}

async function processOrder(order: any) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Insertar orden
        await client.query(
            `INSERT INTO orders (
                order_id, 
                invoiced_date, 
                total_value, 
                currency_code, 
                status
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (order_id) DO NOTHING`,
            [
                order.orderId,
                order.invoicedDate,
                order.value,
                order.storePreferencesData?.currencyCode,
                order.status
            ]
        );

        // 2. Procesar items de la orden
        for (const item of order.items) {
            // Insertar producto
            await client.query(
                `INSERT INTO products (
                    product_id,
                    name,
                    brand_name,
                    category_id,
                    category_name
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (product_id) DO NOTHING`,
                [
                    item.productId,
                    item.name,
                    item.additionalInfo?.brandName,
                    item.additionalInfo?.categories?.[0]?.id,
                    item.additionalInfo?.categories?.[0]?.name
                ]
            );

            // Insertar warehouse
            if (order.shippingData?.logisticsInfo?.[0]?.deliveryIds?.[0]?.warehouseId) {
                await client.query(
                    `INSERT INTO warehouses (
                        warehouse_id,
                        warehouse_name,
                        address_street,
                        address_city,
                        address_state,
                        address_country
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (warehouse_id) DO NOTHING`,
                    [
                        order.shippingData.logisticsInfo[0].deliveryIds[0].warehouseId,
                        order.shippingData.logisticsInfo[0].pickupStoreInfo?.friendlyName,
                        order.shippingData.logisticsInfo[0].pickupStoreInfo?.address?.street,
                        order.shippingData.logisticsInfo[0].pickupStoreInfo?.address?.city,
                        order.shippingData.logisticsInfo[0].pickupStoreInfo?.address?.state,
                        order.shippingData.logisticsInfo[0].pickupStoreInfo?.address?.country
                    ]
                );
            }

            // Insertar destino y obtener su ID
            let destinationId;
            if (order.shippingData?.address) {
                const address = order.shippingData.address;
                const result = await client.query(
                    `INSERT INTO destinations (
                        city,
                        state,
                        country
                    ) VALUES ($1, $2, $3)
                    ON CONFLICT (city, state, country) DO NOTHING
                    RETURNING destination_id`,
                    [address.city, address.state, address.country]
                );
                destinationId = result.rows[0]?.destination_id;
            }

            console.log('warehouseId', order.shippingData?.logisticsInfo?.[0]?.deliveryIds?.[0]?.warehouseId);
           

            // Insertar item de orden
            await client.query(
                `INSERT INTO order_items (
                    order_id,
                    product_id,
                    warehouse_id,
                    destination_id,
                    quantity,
                    unit_price
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (order_id, product_id) DO NOTHING`,
                [
                    order.orderId,
                    item.productId,
                    order.shippingData?.logisticsInfo?.[0]?.deliveryIds?.[0]?.warehouseId,
                    destinationId,
                    item.quantity,
                    item.price
                ]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}