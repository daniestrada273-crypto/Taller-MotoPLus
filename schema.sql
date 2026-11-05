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