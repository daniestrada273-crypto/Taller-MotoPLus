-- Script de Creación de Base de Datos para TallerMP
CREATE DATABASE IF NOT EXISTS taller_mp_db;
USE taller_mp_db;

-- 1. Tabla de Clientes (RF-01)
CREATE TABLE IF NOT EXISTS CLIENTE (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono_principal VARCHAR(15) NOT NULL,
    telefono_secundario VARCHAR(15),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Vehículos (RF-01, RF-12)
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

-- 3. Tabla de Inventario de Recepción (RF-02)
CREATE TABLE IF NOT EXISTS INVENTARIO_RECEPCION (
    id_inventario INT AUTO_INCREMENT PRIMARY KEY,
    placas_vehiculo VARCHAR(10) NOT NULL,
    nivel_combustible VARCHAR(20) NOT NULL,
    danos_carroceria JSON,
    fecha_inspeccion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (placas_vehiculo) REFERENCES VEHICULO(placas)
);

-- 4. Tabla de Órdenes de Servicio (RF-03)
CREATE TABLE IF NOT EXISTS ORDEN_SERVICIO (
    folio VARCHAR(20) PRIMARY KEY,
    placas_vehiculo VARCHAR(10) NOT NULL,
    falla_reportada TEXT NOT NULL,
    mecanico_asignado VARCHAR(100),
    estatus VARCHAR(30) DEFAULT 'Ingresado',
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (placas_vehiculo) REFERENCES VEHICULO(placas)
);