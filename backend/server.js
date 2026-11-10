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
  database: 'Taller-MotorPlus-BD',
  password: 'Vestrani1', 
  port: 5432,
});

// ==========================================================
// MÓDULOS EXISTENTES (CU-01, CU-02, CU-04)
// ==========================================================

// Endpoint 1: Registrar nueva Orden de Servicio (Recepcionista - CU-01)
app.post('/api/ordenes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { cliente, vehiculo, inventario, orden } = req.body;

    // Verificar si el vehículo ya tiene una orden activa (que no esté Terminada)
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

    // A. Insertar Cliente
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

// Endpoint 2: Obtener órdenes activas para la vista de Bahía (Mecánico - CU-02/CU-04)
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

// Endpoint 3: Actualizar estatus desde el módulo de Bahía (CU-04)
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

// ==========================================================
// ENDPOINTS PARA NUEVOS MÓDULOS (CU-03, CU-05, CU-06, CU-07)
// ==========================================================

// --- CU-03: BITÁCORA DE LLAMADAS ---
app.get('/api/llamadas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM BITACORA_LLAMADAS ORDER BY fecha_hora DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llamadas', async (req, res) => {
  const { cliente_contacto, telefono, motivo_llamada, folio_orden } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO BITACORA_LLAMADAS (cliente_contacto, telefono, motivo_llamada, folio_orden, estado_llamada)
       VALUES ($1, $2, $3, $4, 'Pendiente') RETURNING *`,
      [cliente_contacto, telefono, motivo_llamada, folio_orden || null]
    );
    res.status(201).json({ success: true, llamada: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/llamadas/:id/estatus', async (req, res) => {
  const { id } = req.params;
  const { estado_llamada } = req.body;
  try {
    await pool.query(
      `UPDATE BITACORA_LLAMADAS SET estado_llamada = $1 WHERE id_llamada = $2`,
      [estado_llamada, id]
    );
    res.json({ success: true, message: 'Estatus de llamada actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CU-05: TRABAJOS ADICIONALES ---
app.get('/api/trabajos-adicionales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, v.marca || ' ' || v.modelo AS auto, c.nombre || ' ' || c.apellidos AS cliente
      FROM TRABAJO_ADICIONAL t
      JOIN ORDEN_SERVICIO o ON t.folio_orden = o.folio
      JOIN VEHICULO v ON o.placas_vehiculo = v.placas
      JOIN CLIENTE c ON v.id_cliente = c.id_cliente
      ORDER BY t.fecha_registro DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trabajos-adicionales', async (req, res) => {
  const { folio_orden, concepto, justificacion, costo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO TRABAJO_ADICIONAL (folio_orden, concepto, justificacion, costo, estado_autorizacion)
       VALUES ($1, $2, $3, $4, 'Pendiente') RETURNING *`,
      [folio_orden, concepto, justificacion, costo]
    );
    res.status(201).json({ success: true, trabajo: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/trabajos-adicionales/:id/autorizar', async (req, res) => {
  const { id } = req.params;
  const { estado_autorizacion } = req.body; // 'Aprobado' o 'Rechazado'
  try {
    await pool.query(
      `UPDATE TRABAJO_ADICIONAL SET estado_autorizacion = $1 WHERE id_adicional = $2`,
      [estado_autorizacion, id]
    );
    res.json({ success: true, message: 'Autorización actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CU-06: REGISTRAR PAGO (EFECTIVO) ---
app.post('/api/pagos', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { folio_orden, monto_total, efectivo_recibido, cambio, atendido_por } = req.body;

    const pagoRes = await client.query(
      `INSERT INTO PAGO_SERVICIO (folio_orden, monto_total, efectivo_recibido, cambio, atendido_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [folio_orden, monto_total, efectivo_recibido, cambio, atendido_por]
    );

    // Actualizar el estado de la orden a 'Terminado' tras registrar la liquidación
    await client.query(
      `UPDATE ORDEN_SERVICIO SET estatus = 'Terminado' WHERE folio = $1`,
      [folio_orden]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, pago: pagoRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/pagos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, o.placas_vehiculo AS placas, v.marca || ' ' || v.modelo AS auto, c.nombre || ' ' || c.apellidos AS cliente
      FROM PAGO_SERVICIO p
      JOIN ORDEN_SERVICIO o ON p.folio_orden = o.folio
      JOIN VEHICULO v ON o.placas_vehiculo = v.placas
      JOIN CLIENTE c ON v.id_cliente = c.id_cliente
      ORDER BY p.fecha_pago DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CU-07: HISTORIAL VEHICULAR ---
app.get('/api/vehiculos/historial', async (req, res) => {
  const { q } = req.query; // Texto de búsqueda (Placa, Folio o Cliente)
  try {
    const query = `
      SELECT v.placas, v.marca, v.modelo, v.anio, v.color, v.vin,
             c.nombre || ' ' || c.apellidos AS cliente, c.telefono_principal
      FROM VEHICULO v
      JOIN CLIENTE c ON v.id_cliente = c.id_cliente
      WHERE v.placas ILIKE $1 OR c.nombre ILIKE $1 OR c.apellidos ILIKE $1
    `;
    const result = await pool.query(query, [`%${q}%`]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor MotorPlus corriendo en http://localhost:${PORT}`));