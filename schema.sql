-- Script de Base de Datos en PostgreSQL para MotorPlus
CREATE DATABASE taller_mp_db;
\c taller_mp_db;

-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS CLIENTE (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono_principal VARCHAR(15) NOT NULL,
    telefono_secundario VARCHAR(15),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Vehículos
CREATE TABLE IF NOT EXISTS VEHICULO (
    placas VARCHAR(10) PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    color VARCHAR(30) NOT NULL,
    vin VARCHAR(17) UNIQUE,
    id_cliente INT NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente) ON DELETE CASCADE
);

-- 3. Tabla de Inventario e Inspección de Recepción
CREATE TABLE IF NOT EXISTS INVENTARIO_RECEPCION (
    id_inventario SERIAL PRIMARY KEY,
    placas_vehiculo VARCHAR(10) NOT NULL,
    nivel_combustible VARCHAR(20) NOT NULL,
    danos_carroceria JSONB,
    fecha_inspeccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (placas_vehiculo) REFERENCES VEHICULO(placas) ON DELETE CASCADE
);

-- 4. Tabla de Órdenes de Servicio
CREATE TABLE IF NOT EXISTS ORDEN_SERVICIO (
    folio VARCHAR(20) PRIMARY KEY,
    placas_vehiculo VARCHAR(10) NOT NULL,
    falla_reportada TEXT NOT NULL,
    mecanico_asignado VARCHAR(100),
    recepcionista_responsable VARCHAR(100),
    estatus VARCHAR(30) DEFAULT 'Ingresado',
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (placas_vehiculo) REFERENCES VEHICULO(placas) ON DELETE CASCADE
);

-- ==========================================================
-- 5. Tabla de Empleados (Personal: Recepción, Mecánicos, Admin)
-- ==========================================================
CREATE TABLE IF NOT EXISTS EMPLEADO (
    id_empleado SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    rol VARCHAR(40) NOT NULL, -- 'Recepcionista', 'Mecanico', 'Administrador'
    telefono VARCHAR(15)
);

-- ==========================================================
-- 6. Tabla de Bitácora de Llamadas (CU-03)
-- ==========================================================
CREATE TABLE IF NOT EXISTS BITACORA_LLAMADAS (
    id_llamada SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cliente_contacto VARCHAR(150) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    motivo_llamada TEXT NOT NULL,
    estado_llamada VARCHAR(30) DEFAULT 'Pendiente', -- 'Pendiente', 'Sí (Atendida)'
    notas_resolucion TEXT,
    folio_orden VARCHAR(20),
    id_empleado INT,
    FOREIGN KEY (folio_orden) REFERENCES ORDEN_SERVICIO(folio) ON DELETE SET NULL,
    FOREIGN KEY (id_empleado) REFERENCES EMPLEADO(id_empleado) ON DELETE SET NULL
);

-- ==========================================================
-- 7. Tabla de Trabajos Adicionales / Extras (CU-05)
-- ==========================================================
CREATE TABLE IF NOT EXISTS TRABAJO_ADICIONAL (
    id_adicional SERIAL PRIMARY KEY,
    folio_orden VARCHAR(20) NOT NULL,
    concepto VARCHAR(150) NOT NULL,
    justificacion TEXT,
    costo DECIMAL(12,2) NOT NULL,
    estado_autorizacion VARCHAR(30) DEFAULT 'Pendiente', -- 'Pendiente', 'Aprobado', 'Rechazado'
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folio_orden) REFERENCES ORDEN_SERVICIO(folio) ON DELETE CASCADE
);

-- ==========================================================
-- 8. Tabla de Pagos de Servicio - Cobro en Efectivo (CU-06)
-- ==========================================================
CREATE TABLE IF NOT EXISTS PAGO_SERVICIO (
    id_pago SERIAL PRIMARY KEY,
    folio_orden VARCHAR(20) UNIQUE NOT NULL,
    monto_total DECIMAL(12,2) NOT NULL,
    efectivo_recibido DECIMAL(12,2) NOT NULL,
    cambio DECIMAL(12,2) NOT NULL,
    atendido_por VARCHAR(100) NOT NULL, -- Nombre del recepcionista o admin que cobró
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folio_orden) REFERENCES ORDEN_SERVICIO(folio) ON DELETE CASCADE
);