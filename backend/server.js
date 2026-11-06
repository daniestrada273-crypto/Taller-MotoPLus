const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Conexión a la base de datos PostgreSQL local
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Taller_MotorPlus-BD',
  password: 'Vestrani1', 
  port: 5432,
});

// Endpoint 1: Registrar nueva Orden de Servicio (Recepcionista)
app.post('/api/ordenes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { cliente, vehiculo, inventario, orden } = req.body;


    // A. Insertar Cliente
// Antes de insertar la orden, verifica si ya tiene una activa (que no esté Terminada)
const ordenActiva = await client.query(
  `SELECT folio FROM ORDEN_SERVICIO WHERE placas_vehiculo = $1 AND estatus != 'Terminado'`,
  [vehiculo.placas]
);

if (ordenActiva.rows.length > 0) {
  await client.query('ROLLBACK');
  return res.status(400).json({ 
    success: false, 
    error: `El vehículo con placas ${vehiculo.placas} ya cuenta con una orden activa (${ordenActiva.rows[0].folio}).` 
  });
}
    const resCliente = await client.query(
      `INSERT INTO CLIENTE (nombre, apellidos, telefono_principal, telefono_secundario)
       VALUES ($1, $2, $3, $4) RETURNING id_cliente`,
      [cliente.nombre, cliente.apellidos, cliente.telefono1, cliente.telefono2]
    );
    const idCliente = resCliente.rows[0].id_cliente;

    // B. Insertar o actualizar Vehículo
    await client.query(
      `INSERT INTO VEHICULO (placas, marca, modelo, anio, color, vin, id_cliente)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (placas) DO UPDATE 
       SET marca = EXCLUDED.marca, modelo = EXCLUDED.modelo, color = EXCLUDED.color`,
      [vehiculo.placas, vehiculo.marca, vehiculo.modelo, vehiculo.anio, vehiculo.color, vehiculo.vin, idCliente]
    );

    // C. Insertar Inventario e Inspección de Carrocería
    await client.query(
      `INSERT INTO INVENTARIO_RECEPCION (placas_vehiculo, nivel_combustible, danos_carroceria)
       VALUES ($1, $2, $3)`,
      [vehiculo.placas, inventario.combustible, JSON.stringify(inventario.danos)]
    );

    // D. Insertar Orden de Servicio
    const folio = `MP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    await client.query(
      `INSERT INTO ORDEN_SERVICIO (folio, placas_vehiculo, falla_reportada, mecanico_asignado, recepcionista_responsable, estatus)
       VALUES ($1, $2, $3, $4, $5, 'Ingresado')`,
      [folio, vehiculo.placas, orden.falla, orden.mecanico, orden.responsable]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, folio, message: 'Orden guardada con éxito en PostgreSQL' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al insertar:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Endpoint 2: Obtener órdenes activas para la vista de Bahía (Mecánico)
app.get('/api/ordenes', async (req, res) => {
  try {
    const query = `
      SELECT o.folio, o.placas_vehiculo AS placas, o.falla_reportada AS falla, 
             o.mecanico_asignado AS mecanico, o.estatus AS estado, o.fecha_ingreso AS hora,
             v.marca || ' ' || v.modelo AS auto,
             c.nombre || ' ' || c.apellidos AS cliente
      FROM ORDEN_SERVICIO o
      JOIN VEHICULO v ON o.placas_vehiculo = v.placas
      JOIN CLIENTE c ON v.id_cliente = c.id_cliente
      ORDER BY o.fecha_ingreso DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 3: Actualizar estatus desde el módulo de Bahía
app.patch('/api/ordenes/:folio/estatus', async (req, res) => {
  const { folio } = req.params;
  const { estatus } = req.body;
  try {
    const resultado = await pool.query(
      'UPDATE ORDEN_SERVICIO SET estatus = $1 WHERE folio = $2 RETURNING *', 
      [estatus, folio]
    );
    
    if (resultado.rowCount > 0) {
      res.json({ success: true, message: 'Estado actualizado correctamente' });
    } else {
      res.status(404).json({ success: false, error: 'Folio no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(` Servidor MotorPlus corriendo en http://localhost:${PORT}`));