export interface WarehouseProduct {
    product_id: string;
    product_name: string;
    brand_name: string;
    category_name: string;
    total_shipments: number;
    total_quantity: number;
    total_value: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
