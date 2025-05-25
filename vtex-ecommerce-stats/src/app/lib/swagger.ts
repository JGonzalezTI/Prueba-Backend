import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VTEX E-commerce Stats API',
      version: '1.0.0',
      description: 'API para análisis de estadísticas de e-commerce',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      schemas: {
        Movement: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                category: { type: 'string' }
              }
            },
            warehouse: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            },
            destination: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' }
              }
            },
            movement: {
              type: 'object',
              properties: {
                quantity: { type: 'integer' },
                value: { type: 'number' },
                date: { type: 'string', format: 'date-time' },
                status: { type: 'string' }
              }
            }
          }
        },
        DashboardMetrics: {
          type: 'object',
          properties: {
            generalMetrics: {
              type: 'object',
              properties: {
                totalOrders: { type: 'integer' },
                totalProducts: { type: 'integer' },
                totalValue: { type: 'number' },
                totalWarehouses: { type: 'integer' },
                totalCities: { type: 'integer' }
              }
            },
            topProducts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: 'string' },
                  totalOrders: { type: 'integer' },
                  totalQuantity: { type: 'integer' },
                  totalValue: { type: 'number' }
                }
              }
            },
            topCities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  city: { type: 'string' },
                  state: { type: 'string' },
                  country: { type: 'string' },
                  totalOrders: { type: 'integer' },
                  totalQuantity: { type: 'integer' },
                  totalValue: { type: 'number' }
                }
              }
            },
            categoryDistribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  totalOrders: { type: 'integer' },
                  totalQuantity: { type: 'integer' },
                  percentage: { type: 'number' }
                }
              }
            },
            temporalTrends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', format: 'date-time' },
                  totalOrders: { type: 'integer' },
                  totalQuantity: { type: 'integer' },
                  totalValue: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/app/api/**/*.ts'], // Ruta a los archivos de la API
};

export const swaggerSpec = swaggerJsdoc(options); 