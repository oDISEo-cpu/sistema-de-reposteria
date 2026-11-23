-- Esquema completo del sistema de repostería (se puede ejecutar varias veces sin dañar nada).
-- Para Neon: pega todo este archivo en SQL Editor y pulsa Run.

-- Usuarios (administradores y pasteleros del equipo)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'empleado',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventario (ingredientes, materiales y productos)
CREATE TABLE IF NOT EXISTS inventario (
    id SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(20) NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Recetas (productos terminados que se venden)
CREATE TABLE IF NOT EXISTS recetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC(10, 2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredientes de cada receta
CREATE TABLE IF NOT EXISTS receta_ingredientes (
    id SERIAL PRIMARY KEY,
    receta_id INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 3) NOT NULL CHECK (cantidad > 0),
    UNIQUE (receta_id, inventario_id)
);

-- Órdenes de producción (historial de lo que se prepara)
CREATE TABLE IF NOT EXISTS ordenes_produccion (
    id SERIAL PRIMARY KEY,
    receta_id INTEGER REFERENCES recetas(id) ON DELETE SET NULL,
    receta_nombre VARCHAR(100) NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL CHECK (cantidad > 0),
    costo_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos de clientes
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(120) NOT NULL,
    telefono VARCHAR(30),
    fecha_entrega DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado')),
    notas TEXT,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos de cada pedido (guarda precio y costo del momento de la venta)
CREATE TABLE IF NOT EXISTS pedido_detalle (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    receta_id INTEGER NOT NULL REFERENCES recetas(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 2) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    costo_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    UNIQUE (pedido_id, receta_id)
);

-- Pagos y abonos (en $ o en Bs con su tasa, con captura opcional guardada en la base)
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    metodo VARCHAR(30) NOT NULL DEFAULT 'efectivo'
        CHECK (metodo IN ('efectivo', 'tarjeta', 'transferencia', 'pago_movil', 'otro')),
    referencia VARCHAR(100),
    comprobante VARCHAR(100),
    comprobante_data BYTEA,
    comprobante_tipo VARCHAR(30),
    ref_verificada BOOLEAN,
    monto_bs NUMERIC(18, 2),
    tasa NUMERIC(18, 4),
    tasa_tipo VARCHAR(20),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasas de cambio (dólar BCV, euro BCV, USDT); las actualiza el servidor solo
CREATE TABLE IF NOT EXISTS tasas (
    clave VARCHAR(20) PRIMARY KEY,
    valor NUMERIC(18, 4) NOT NULL,
    fuente VARCHAR(80),
    fecha_fuente VARCHAR(80),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_creado_en ON pedidos (creado_en);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_pedido ON pedido_detalle (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_creado_en ON pagos (creado_en);
