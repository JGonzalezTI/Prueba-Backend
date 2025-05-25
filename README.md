# Dashboard Logístico VTEX

Este proyecto es un dashboard logístico que permite analizar y visualizar datos de envíos, productos y almacenes de VTEX. Desarrollado con Next.js, proporciona una interfaz moderna y responsive para el análisis de datos logísticos.

## 🚀 Características Principales

- Sincronización automática con VTEX
- Análisis de almacenes y productos
- Visualización de destinos y rutas
- Dashboard con métricas en tiempo real
- Exportación de datos a Excel
- Interfaz responsive y moderna

## 📋 Prerrequisitos

- Node.js 18.x o superior
- PostgreSQL 14.x o superior
- Credenciales de VTEX API
- Credenciales de base de datos PostgreSQL

## 🔧 Configuración

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
# o
yarn install
```

3. Configurar variables de entorno:
Las credenciales de conexión a la base de datos, URLs de VTEX, tokens de acceso y archivo .env han sido enviados al correo de la prueba técnica.

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
# o
yarn dev
```

## 📊 Sincronización con VTEX

La sincronización con VTEX es el primer paso necesario para alimentar la base de datos PostgreSQL con datos actualizados. Este proceso:

1. Obtiene órdenes de VTEX mediante su API
2. Procesa y normaliza los datos
3. Almacena la información en las tablas correspondientes
4. Mantiene un registro de la última sincronización

Para iniciar la sincronización:
```bash
POST /api/sync/vtex

```

## 🛠️ Justificación de Decisiones Técnicas

### Next.js
- **Integración Full-Stack**: Permite tener el servidor y cliente en un solo entorno, facilitando el desarrollo y mantenimiento.
- **API Routes**: Proporciona una forma sencilla de crear endpoints API sin necesidad de un backend separado.
- **Server-Side Rendering**: Mejora el SEO y el rendimiento inicial de la aplicación.
- **TypeScript**: Implementado para mayor seguridad de tipos y mejor mantenibilidad del código.

### PostgreSQL
- **Relaciones Complejas**: Ideal para manejar las relaciones entre órdenes, productos, almacenes y destinos.
- **Transacciones**: Garantiza la integridad de los datos durante la sincronización.
- **Índices**: Optimiza las consultas frecuentes en el dashboard.

### Arquitectura
- **API REST**: Diseño RESTful para una clara separación de responsabilidades.
- **Paginación**: Implementada para manejar grandes volúmenes de datos eficientemente.

## 📱 Capturas de Pantalla

Las capturas de pantalla del frontend de la aplicación se encuentran en la carpeta `/public`:

### Dashboard Principal
![Dashboard Principal](/vtex-ecommerce-stats/public/dash.png)

### Vista de Productos por Almacén
![Productos por Almacén](/vtex-ecommerce-stats/public/almacen-cuidad.png)

### Análisis de Destinos
![Análisis de Destinos](/vtex-ecommerce-stats/public/destinos-producto.png)


## 📚 Documentación de la API

### 1. Análisis de Almacenes

GET /api/warehouses/:warehouseId/products
- Obtiene todos los productos enviados desde un almacén específico
- Parámetros opcionales: startDate, endDate, limit, page

GET /api/warehouses/:warehouseId/stats
- Obtiene estadísticas de envíos por almacén
- Parámetros opcionales: startDate, endDate

### 2. Análisis de Productos

GET /api/products/:productId/destinations
- Obtiene todas las ciudades destino para un producto específico
- Parámetros opcionales: startDate, endDate, limit, page

GET /api/products/:productId/distribution-stats
- Obtiene estadísticas de distribución de un producto
- Parámetros opcionales: startDate, endDate

### 3. Análisis de Destinos

GET /api/destinations/:cityId/warehouses
- Obtiene todos los almacenes que envían a una ciudad específica
- Parámetros opcionales: startDate, endDate, limit, page

GET /api/destinations/:cityId/stats
- Obtiene estadísticas de envíos a una ciudad
- Parámetros opcionales: startDate, endDate

### 4. Análisis General

GET /api/movements
- Obtiene movimientos generales (producto-origen-destino)
- Parámetros requeridos: startDate, endDate
- Parámetros opcionales: productId, warehouseId, cityId, limit, page

GET /api/dashboard
- Obtiene dashboard con métricas generales
- Parámetros opcionales: startDate, endDate

### 5. Sincronización con VTEX

POST /api/sync/vtex
- Sincroniza datos desde VTEX
- Body requerido: { startDate, endDate }

GET /api/sync/status
- Obtiene estado de la última sincronización

## 📦 Colección Postman

La colección completa de rutas de la API en formato JSON para Postman ha sido enviada al correo de la prueba técnica.

## 🧠 Ejercicio de Inteligencia Artificial

### Detección de Patrones Anómalos en Distribución

#### Enfoque con TensorFlow
Para detectar patrones de distribución atípicos, se podria un sistema basado en TensorFlow que utiliza:

1. **Autoencoders**:
   - Detección de anomalías no lineales
   - Aprendizaje de patrones normales de distribución
   - Reconstrucción de datos para identificar desviaciones

2. **Variables de Análisis**:
   - Frecuencia de envíos
   - Volumen por ruta
   - Distancia al destino
   - Tiempo entre envíos
   - Historial de ventas

#### Implementación
```python
import tensorflow as tf
from tensorflow.keras import layers, models
import pandas as pd
import numpy as np

def create_anomaly_detector(input_dim):
    # Autoencoder para detección de anomalías
    encoder = models.Sequential([
        layers.Dense(64, activation='relu', input_shape=(input_dim,)),
        layers.Dense(32, activation='relu'),
        layers.Dense(16, activation='relu')
    ])
    
    decoder = models.Sequential([
        layers.Dense(32, activation='relu'),
        layers.Dense(64, activation='relu'),
        layers.Dense(input_dim, activation='sigmoid')
    ])
    
    autoencoder = models.Sequential([encoder, decoder])
    autoencoder.compile(optimizer='adam', loss='mse')
    return autoencoder

def detect_anomalies(distribution_data):
    # Preparar y normalizar datos
    features = ['frequency', 'volume', 'distance', 'time_delta']
    X = distribution_data[features]
    X_scaled = StandardScaler().fit_transform(X)
    
    # Entrenar modelo
    model = create_anomaly_detector(len(features))
    model.fit(X_scaled, X_scaled, epochs=50, batch_size=32, verbose=0)
    
    # Detectar anomalías
    predictions = model.predict(X_scaled)
    mse = np.mean(np.power(X_scaled - predictions, 2), axis=1)
    return mse > np.percentile(mse, 95)
```

#### Arquitectura de Implementación

Es mejor implementar el análisis como un proceso separado del backend principal por las siguientes razones:

1. **Rendimiento y Recursos**:
   - Los modelos de TensorFlow requieren recursos computacionales significativos
   - El entrenamiento puede ser intensivo en CPU/GPU
   - La inferencia en tiempo real puede impactar el rendimiento del API

2. **Arquitectura Propuesta**:
   ```
   [API Principal] -> [Cola de Mensajes] -> [Servicio TensorFlow] -> [Base de Datos de Resultados]
   ```

3. **Proceso de Análisis**:
   - Entrenamiento programado (ej: semanal)
   - Inferencia en lotes
   - Almacenamiento de resultados
   - API dedicada para consultas

4. **Ventajas de la Separación**:
   - Escalabilidad independiente
   - Actualización de modelos sin afectar el backend
   - Mejor gestión de recursos
   - Facilidad de mantenimiento

5. **Integración**:
   - API REST para consultar anomalías
   - Webhooks para notificaciones
   - Dashboard específico para visualización
   - Exportación de resultados

#### Monitoreo y Visualización
- TensorBoard para seguimiento del entrenamiento
- Métricas de rendimiento del modelo
- Visualización de anomalías detectadas
- Alertas automáticas

## 🎯 Visión de Mejora en E-commerce

### Sistema de Optimización de Inventario y Logística Inteligente

Si tuviera libertad total para mejorar un proceso digital en ecommerce, desarrollaría un sistema integral de optimización de inventario y logística inteligente que combine:

1. **Predicción de Demanda en Tiempo Real**:
   - Análisis de patrones de compra históricos
   - Factores externos (tendencias, temporadas, eventos)
   - Machine Learning para ajuste dinámico de pronósticos
   - Integración con datos de redes sociales y búsquedas

2. **Optimización de Inventario Distribuido**:
   - Algoritmos de IA para determinar ubicación óptima de productos
   - Balanceo automático entre almacenes
   - Minimización de costos de almacenamiento y envío
   - Predicción de stock mínimo por ubicación

3. **Ruteo Inteligente de Envíos**:
   - Optimización de rutas en tiempo real
   - Consideración de tráfico, clima y restricciones
   - Agrupación inteligente de pedidos
   - Ajuste dinámico de capacidades de entrega

4. **Personalización de Experiencia**:
   - Recomendaciones de productos basadas en patrones de compra
   - Predicción de necesidades futuras
   - Optimización de precios dinámica
   - Personalización de tiempos de entrega

#### Implementación Técnica

1. **Arquitectura**:
   ```
   [Sistema de Captura de Datos]
         ↓
   [Procesamiento en Tiempo Real]
         ↓
   [Modelos de IA/ML]
         ↓
   [API de Optimización]
         ↓
   [Interfaz de Usuario]
   ```

2. **Tecnologías**:
   - Backend: Node.js + Python para procesamiento
   - Base de Datos: PostgreSQL + TimescaleDB
   - IA/ML: TensorFlow + PyTorch
   - Procesamiento: Apache Kafka + Spark
   - Visualización: React + D3.js

3. **Proceso de Desarrollo**:
   - Fase 1: Implementación de captura y procesamiento de datos
   - Fase 2: Desarrollo de modelos predictivos
   - Fase 3: Integración de optimización en tiempo real
   - Fase 4: Desarrollo de interfaces y dashboards

4. **Métricas de Éxito**:
   - Reducción de costos de inventario
   - Mejora en tiempos de entrega
   - Aumento en satisfacción del cliente
   - Optimización de recursos logísticos




