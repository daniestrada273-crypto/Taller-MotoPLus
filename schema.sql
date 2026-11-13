-- ==========================================================
-- Script de Base de Datos en PostgreSQL para MotorPlus
-- Actualizado conforme al Diagrama Entidad-Relación (ER)
-- ==========================================================

CREATE DATABASE Taller-MotorPlus-BD;
\c "Taller-MotorPlus-BD"

-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS CLIENTE (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    telefono_principal VARCHAR(20) NOT NULL,
    telefono_secundario VARCHAR(20)
);

-- 2. Tabla de Vehículos
CREATE TABLE IF NOT EXISTS VEHICULO (
    id_vehiculo SERIAL PRIMARY KEY,
    placas VARCHAR(15) NOT NULL,
    vin VARCHAR(17) NOT NULL,
    marca VARCHAR(60) NOT NULL,
    modelo VARCHAR(60) NOT NULL,
    anio SMALLINT NOT NULL,
    color VARCHAR(40),
    id_cliente INT NOT NULL,
    CONSTRAINT fk_vehiculo_cliente FOREIGN KEY (id_cliente) 
        REFERENCES CLIENTE(id_cliente) ON DELETE CASCADE
);

-- 3. Tabla de Empleados (Recepción, Mecánicos, Administración)
CREATE TABLE IF NOT EXISTS EMPLEADO (
    id_empleado SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    rol VARCHAR(40) NOT NULL, -- 'Recepcionista', 'Mecanico', 'Administrador'
    telefono VARCHAR(20)
);

-- 4. Tabla de Órdenes de Servicio
CREATE TABLE IF NOT EXISTS ORDEN_SERVICIO (
    id_orden SERIAL PRIMARY KEY,
    folio VARCHAR(30) UNIQUE NOT NULL, -- AK (Llave Alterna)
    fecha_ingreso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    falla_reportada TEXT NOT NULL,
    estado_servicio VARCHAR(30) NOT NULL DEFAULT 'Ingresado',
    id_vehiculo INT NOT NULL,
    id_empleado_recepcion INT NOT NULL,
    id_mecanico_asignado INT NOT NULL,
    CONSTRAINT fk_orden_vehiculo FOREIGN KEY (id_vehiculo) 
        REFERENCES VEHICULO(id_vehiculo) ON DELETE CASCADE,
    CONSTRAINT fk_orden_recepcion FOREIGN KEY (id_empleado_recepcion) 
        REFERENCES EMPLEADO(id_empleado) ON DELETE RESTRICT,
    CONSTRAINT fk_orden_mecanico FOREIGN KEY (id_mecanico_asignado) 
        REFERENCES EMPLEADO(id_empleado) ON DELETE RESTRICT
);

-- 5. Tabla de Inventario e Inspección de Recepción (Relación 1:1 con Orden)
CREATE TABLE IF NOT EXISTS INVENTARIO_RECEPCION (
    id_inventario SERIAL PRIMARY KEY,
    nivel_combustible VARCHAR(20),
    danos_carroceria TEXT,
    accesorios_pertenencias TEXT,
    id_orden INT UNIQUE NOT NULL, -- FK, AK (Garantiza relación 1:1)
    CONSTRAINT fk_inventario_orden FOREIGN KEY (id_orden) 
        REFERENCES ORDEN_SERVICIO(id_orden) ON DELETE CASCADE
);

-- 6. Tabla de Trabajos Adicionales / Extras
CREATE TABLE IF NOT EXISTS TRABAJO_ADICIONAL (
    id_adicional SERIAL PRIMARY KEY,
    descripcion_averia TEXT NOT NULL,
    costo_refaccion DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    costo_mano_obra DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado_autorizacion VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    fecha_hora_autorizacion TIMESTAMP,
    medio_confirmacion VARCHAR(30),
    id_orden INT NOT NULL,
    CONSTRAINT fk_adicional_orden FOREIGN KEY (id_orden) 
        REFERENCES ORDEN_SERVICIO(id_orden) ON DELETE CASCADE
);

-- 7. Tabla de Bitácora de Llamadas
CREATE TABLE IF NOT EXISTS BITACORA_LLAMADAS (
    id_llamada SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cliente_contacto VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    motivo_llamada VARCHAR(200) NOT NULL,
    estado_llamada VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    notas_resolucion TEXT,
    id_orden INT NOT NULL,
    id_empleado INT NOT NULL,
    CONSTRAINT fk_llamada_orden FOREIGN KEY (id_orden) 
        REFERENCES ORDEN_SERVICIO(id_orden) ON DELETE CASCADE,
    CONSTRAINT fk_llamada_empleado FOREIGN KEY (id_empleado) 
        REFERENCES EMPLEADO(id_empleado) ON DELETE RESTRICT
);

-- 8. Tabla de Pagos de Servicio (Relación 1:1 con Orden)
CREATE TABLE IF NOT EXISTS PAGO_SERVICIO (
    id_pago SERIAL PRIMARY KEY,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal_refacciones DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal_mano_obra DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    monto_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_liquidado DECIMAL(12,2) NOT NULL,
    id_orden INT UNIQUE NOT NULL, -- FK, AK (Garantiza relación 1:1)
    id_administrador_autoriza INT, -- Puede ser NULL según diagrama
    CONSTRAINT fk_pago_orden FOREIGN KEY (id_orden) 
        REFERENCES ORDEN_SERVICIO(id_orden) ON DELETE CASCADE,
    CONSTRAINT fk_pago_admin FOREIGN KEY (id_administrador_autoriza) 
        REFERENCES EMPLEADO(id_empleado) ON DELETE SET NULL
);