const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================================
// Conexión a PostgreSQL (puedes cambiarla con variables de entorno)
// ==========================================================
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'Taller-MotorPlus-BD',
  password: process.env.PGPASSWORD || 'Vestrani1',
  port: Number(process.env.PGPORT) || 5432,
});

pool.on('error', (err) => console.error('Error inesperado en el pool de PostgreSQL:', err.message));

// ==========================================================
// Utilidades
// ==========================================================

// Envuelve cada ruta para capturar errores y responder siempre en JSON
const ruta = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((error) => {
    console.error(`Error en ${req.method} ${req.originalUrl}:`, error.message);
    let mensaje = error.message;
    if (error.code === '42P01' || error.code === '42703') {
      mensaje = `La base de datos no coincide con el esquema esperado (${error.message}).`;
    }
    if (!res.headersSent) res.status(500).json({ success: false, error: mensaje });
  });

const ESTATUS_VALIDOS = ['Ingresado', 'En diagnóstico', 'Esperando refacciones', 'En reparación', 'Terminado'];
const ROLES_VALIDOS = ['Recepcionista', 'Mecanico', 'Administrador'];
const SEPARADOR_JUSTIFICACION = '\n\nJustificación: ';

// Se activa al arrancar si existe (o se pudo crear) la columna ORDEN_SERVICIO.costo_base
let hayCostoBase = false;
const costoBaseSQL = () => (hayCostoBase ? 'o.costo_base' : '1500.00');
const redondear = (n) => Math.round(n * 100) / 100;

// Nombres de columnas que el diagrama escribe con ñ pero el script SQL sin ñ.
// Se detectan al arrancar para funcionar con cualquiera de las dos versiones.
const COL = { anio: 'anio', danos: 'danos_carroceria' };

const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '');
const recortar = (v, max) => (v == null ? null : String(v).trim().slice(0, max));

// "Roberto Sánchez (Elevador 1 - Motor)" -> "Roberto Sánchez"
const limpiarNombre = (v) => String(v ?? '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

// Busca un empleado por nombre completo; si no existe lo crea con el rol indicado
async function obtenerEmpleado(db, nombreCompleto, rol) {
  const nombre = limpiarNombre(nombreCompleto) || (rol === 'Mecanico' ? 'Mecánico sin asignar' : 'Recepción');
  const rolFinal = ROLES_VALIDOS.includes(rol) ? rol : 'Recepcionista';

  const existente = await db.query(
    `SELECT id_empleado FROM EMPLEADO
     WHERE LOWER(nombre || ' ' || apellidos) = LOWER($1)
        OR LOWER(nombre) = LOWER($1)
     ORDER BY (rol = $2) DESC, id_empleado LIMIT 1`,
    [nombre, rolFinal]
  );
  if (existente.rowCount > 0) return existente.rows[0].id_empleado;

  const partes = nombre.split(' ');
  const creado = await db.query(
    `INSERT INTO EMPLEADO (nombre, apellidos, rol) VALUES ($1, $2, $3) RETURNING id_empleado`,
    [recortar(partes[0], 100), recortar(partes.slice(1).join(' ') || '-', 150), rolFinal]
  );
  return creado.rows[0].id_empleado;
}

// Convierte una fila de TRABAJO_ADICIONAL al formato que usa el frontend
function formatearExtra(f) {
  const [concepto, ...resto] = String(f.descripcion_averia || '').split(SEPARADOR_JUSTIFICACION);
  const refaccion = Number(f.costo_refaccion) || 0;
  const manoObra = Number(f.costo_mano_obra) || 0;
  return {
    id_adicional: f.id_adicional,
    folio_orden: f.folio_orden,
    placas: f.placas,
    auto: f.auto,
    cliente: f.cliente,
    concepto,
    justificacion: resto.join(SEPARADOR_JUSTIFICACION),
    costo_refaccion: refaccion,
    costo_mano_obra: manoObra,
    costo: refaccion + manoObra,
    estado_autorizacion: f.estado_autorizacion,
    fecha_hora_autorizacion: f.fecha_hora_autorizacion,
    medio_confirmacion: f.medio_confirmacion,
  };
}

// ==========================================================
// CU-01 / CU-02 / CU-04: ÓRDENES DE SERVICIO
// ==========================================================

// Registrar nueva orden (cliente + vehículo + inventario + orden)
app.post('/api/ordenes', ruta(async (req, res) => {
  const { cliente, vehiculo, inventario, orden } = req.body || {};

  if (!cliente?.nombre || !cliente?.telefono1 || !vehiculo?.placas || !orden?.falla) {
    return res.status(400).json({ success: false, error: 'Faltan datos obligatorios (cliente, teléfono, placas o falla).' });
  }

  if (!vehiculo.marca || !vehiculo.modelo) {
    return res.status(400).json({ success: false, error: 'Indique la marca y el modelo del vehículo.' });
  }

  const placas = recortar(String(vehiculo.placas).toUpperCase(), 15);
  const telefono1 = recortar(cliente.telefono1, 20);
  const anio = Number.isInteger(Number(vehiculo.anio)) && Number(vehiculo.anio) > 1900 ? Number(vehiculo.anio) : null;
  const vin = vehiculo.vin ? recortar(String(vehiculo.vin).toUpperCase(), 17) : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. El vehículo no debe tener otra orden activa
    const ordenActiva = await client.query(
      `SELECT o.folio FROM ORDEN_SERVICIO o
       JOIN VEHICULO v ON o.id_vehiculo = v.id_vehiculo
       WHERE UPPER(v.placas) = $1 AND o.estado_servicio <> 'Terminado'`,
      [placas]
    );
    if (ordenActiva.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `El vehículo con placas ${placas} ya cuenta con una orden activa (${ordenActiva.rows[0].folio}).`
      });
    }

    // 2. Vehículo existente (y su cliente actual), si lo hay
    const vehExistente = await client.query(
      `SELECT v.id_vehiculo, c.id_cliente, c.nombre, c.apellidos, c.telefono_principal
       FROM VEHICULO v JOIN CLIENTE c ON v.id_cliente = c.id_cliente
       WHERE UPPER(v.placas) = $1 ORDER BY v.id_vehiculo DESC LIMIT 1`,
      [placas]
    );
    const previo = vehExistente.rows[0];

    // 3. Cliente: se reutiliza si es la misma persona y teléfono; si no, se crea
    const mismoCliente = previo
      && previo.nombre.trim().toLowerCase() === cliente.nombre.trim().toLowerCase()
      && (previo.apellidos || '').trim().toLowerCase() === (cliente.apellidos || '').trim().toLowerCase()
      && soloDigitos(previo.telefono_principal) === soloDigitos(telefono1);

    let idCliente;
    if (mismoCliente) {
      idCliente = previo.id_cliente;
      await client.query(
        `UPDATE CLIENTE SET telefono_secundario = COALESCE($1, telefono_secundario) WHERE id_cliente = $2`,
        [recortar(cliente.telefono2, 20) || null, idCliente]
      );
    } else {
      const resCliente = await client.query(
        `INSERT INTO CLIENTE (nombre, apellidos, telefono_principal, telefono_secundario)
         VALUES ($1, $2, $3, $4) RETURNING id_cliente`,
        [recortar(cliente.nombre, 100), recortar(cliente.apellidos || '-', 150), telefono1, recortar(cliente.telefono2, 20) || null]
      );
      idCliente = resCliente.rows[0].id_cliente;
    }

    // 4. Vehículo: actualizar si existe, crear si no (PLACAS no es única en la tabla)
    let idVehiculo;
    if (previo) {
      idVehiculo = previo.id_vehiculo;
      await client.query(
        `UPDATE VEHICULO
         SET marca = $1, modelo = $2, color = $3, ${COL.anio} = COALESCE($4, ${COL.anio}),
             vin = COALESCE($5, vin), id_cliente = $6
         WHERE id_vehiculo = $7`,
        [recortar(vehiculo.marca, 60), recortar(vehiculo.modelo, 60), recortar(vehiculo.color, 40) || null, anio, vin, idCliente, idVehiculo]
      );
    } else {
      const resVeh = await client.query(
        `INSERT INTO VEHICULO (placas, vin, marca, modelo, ${COL.anio}, color, id_cliente)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_vehiculo`,
        [
          placas,
          vin || recortar(`SIN-VIN-${placas}`, 17),          // VIN es obligatorio en la tabla
          recortar(vehiculo.marca, 60),
          recortar(vehiculo.modelo, 60),
          anio || new Date().getFullYear(),                  // AÑO es obligatorio en la tabla
          recortar(vehiculo.color, 40) || null,
          idCliente
        ]
      );
      idVehiculo = resVeh.rows[0].id_vehiculo;
    }

    // 5. Empleados (recepción y mecánico) -> sus ids
    const idRecepcion = await obtenerEmpleado(client, orden.responsable, 'Recepcionista');
    const idMecanico = await obtenerEmpleado(client, orden.mecanico, 'Mecanico');

    // 6. Folio único
    const anioActual = new Date().getFullYear();
    let folio;
    do {
      folio = `MP-${anioActual}-${Math.floor(1000 + Math.random() * 9000)}`;
    } while ((await client.query('SELECT 1 FROM ORDEN_SERVICIO WHERE folio = $1', [folio])).rowCount > 0);

    // 7. Orden de servicio
    const resOrden = await client.query(
      `INSERT INTO ORDEN_SERVICIO (folio, falla_reportada, estado_servicio, id_vehiculo, id_empleado_recepcion, id_mecanico_asignado)
       VALUES ($1, $2, 'Ingresado', $3, $4, $5) RETURNING id_orden`,
      [folio, orden.falla, idVehiculo, idRecepcion, idMecanico]
    );

    // 8. Inventario / inspección de recepción (1:1 con la orden)
    await client.query(
      `INSERT INTO INVENTARIO_RECEPCION (nivel_combustible, ${COL.danos}, accesorios_pertenencias, id_orden)
       VALUES ($1, $2, $3, $4)`,
      [
        recortar(inventario?.combustible, 20),
        JSON.stringify(inventario?.danos || []),
        inventario?.accesorios || null,
        resOrden.rows[0].id_orden
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, folio, message: 'Orden guardada con éxito en PostgreSQL' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}));

// Listado de órdenes (bahía, consulta de estatus y login del cliente)
app.get('/api/ordenes', ruta(async (req, res) => {
  const result = await pool.query(`
    SELECT o.folio,
           v.placas,
           o.falla_reportada AS falla,
           COALESCE(m.nombre || ' ' || m.apellidos, 'Sin asignar') AS mecanico,
           o.estado_servicio AS estado,
           to_char(o.fecha_ingreso, 'DD/MM/YYYY HH24:MI') AS hora,
           o.fecha_ingreso,
           ${costoBaseSQL()} AS costo_base,
           v.marca || ' ' || v.modelo AS auto,
           c.nombre || ' ' || c.apellidos AS cliente,
           c.telefono_principal AS telefono
    FROM ORDEN_SERVICIO o
    JOIN VEHICULO v ON o.id_vehiculo = v.id_vehiculo
    JOIN CLIENTE c ON v.id_cliente = c.id_cliente
    LEFT JOIN EMPLEADO m ON o.id_mecanico_asignado = m.id_empleado
    ORDER BY o.fecha_ingreso DESC, o.id_orden DESC
  `);
  res.json(result.rows.map(r => ({ ...r, costo_base: Number(r.costo_base) })));
}));

// Cambiar la fase operativa desde el módulo de bahía.
// Una orden Terminada queda cerrada: ya no puede cambiar de estatus.
app.patch('/api/ordenes/:folio/estatus', ruta(async (req, res) => {
  const { folio } = req.params;
  const { estatus } = req.body || {};

  if (!ESTATUS_VALIDOS.includes(estatus)) {
    return res.status(400).json({ success: false, error: 'Estatus no válido.' });
  }

  const actual = await pool.query('SELECT estado_servicio FROM ORDEN_SERVICIO WHERE folio = $1', [folio]);
  if (actual.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Folio no encontrado' });
  }

  const estadoActual = actual.rows[0].estado_servicio;
  if (estadoActual === estatus) {
    return res.json({ success: true, message: 'Sin cambios' });
  }
  if (estadoActual === 'Terminado') {
    return res.status(409).json({ success: false, error: 'La orden ya está Terminada y no puede cambiar de estatus.' });
  }

  const resultado = await pool.query(
    `UPDATE ORDEN_SERVICIO SET estado_servicio = $1 WHERE folio = $2 AND estado_servicio <> 'Terminado'`,
    [estatus, folio]
  );
  if (resultado.rowCount === 0) {
    return res.status(409).json({ success: false, error: 'La orden ya está Terminada y no puede cambiar de estatus.' });
  }
  res.json({ success: true, message: 'Estado actualizado correctamente' });
}));

// Modificar el costo base del servicio: solo el mecánico y solo mientras la orden no esté Terminada ni pagada
app.patch('/api/ordenes/:folio/costo-base', ruta(async (req, res) => {
  const { folio } = req.params;
  const { rol } = req.body || {};
  const costo = Number(req.body?.costo_base);

  if (!hayCostoBase) {
    return res.status(503).json({ success: false, error: 'La columna costo_base no está disponible en la base de datos.' });
  }
  if (rol !== 'Mecanico') {
    return res.status(403).json({ success: false, error: 'Solo el mecánico puede modificar el costo base.' });
  }
  if (!Number.isFinite(costo) || costo < 0 || costo > 9999999.99) {
    return res.status(400).json({ success: false, error: 'Indique un costo base válido (0 o mayor).' });
  }

  const orden = await pool.query(
    `SELECT o.estado_servicio,
            EXISTS (SELECT 1 FROM PAGO_SERVICIO p WHERE p.id_orden = o.id_orden) AS pagada
     FROM ORDEN_SERVICIO o WHERE o.folio = $1`,
    [folio]
  );
  if (orden.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Folio no encontrado' });
  }
  if (orden.rows[0].estado_servicio === 'Terminado' || orden.rows[0].pagada) {
    return res.status(409).json({ success: false, error: 'La orden ya está terminada o pagada; el costo base no se puede modificar.' });
  }

  const resultado = await pool.query(
    `UPDATE ORDEN_SERVICIO SET costo_base = $1
     WHERE folio = $2 AND estado_servicio <> 'Terminado'
       AND NOT EXISTS (SELECT 1 FROM PAGO_SERVICIO p WHERE p.id_orden = ORDEN_SERVICIO.id_orden)`,
    [redondear(costo), folio]
  );
  if (resultado.rowCount === 0) {
    return res.status(409).json({ success: false, error: 'La orden ya está terminada o pagada; el costo base no se puede modificar.' });
  }
  res.json({ success: true, costo_base: redondear(costo) });
}));

// ==========================================================
// CU-03: BITÁCORA DE LLAMADAS
// ==========================================================
app.get('/api/llamadas', ruta(async (req, res) => {
  const result = await pool.query(`
    SELECT l.id_llamada, to_char(l.fecha_hora, 'DD/MM/YYYY HH24:MI') AS fecha_hora,
           l.cliente_contacto, l.telefono, l.motivo_llamada, l.estado_llamada,
           l.notas_resolucion, o.folio AS folio_orden
    FROM BITACORA_LLAMADAS l
    JOIN ORDEN_SERVICIO o ON l.id_orden = o.id_orden
    ORDER BY l.fecha_hora DESC, l.id_llamada DESC
  `);
  res.json(result.rows);
}));

app.post('/api/llamadas', ruta(async (req, res) => {
  const { cliente_contacto, telefono, motivo_llamada, folio_orden, estado_llamada, registrado_por, rol } = req.body || {};

  if (!cliente_contacto || !motivo_llamada) {
    return res.status(400).json({ success: false, error: 'Indique quién llamó y el motivo de la llamada.' });
  }
  if (!folio_orden) {
    return res.status(400).json({ success: false, error: 'Seleccione la orden de servicio relacionada con la llamada.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orden = await client.query(
      `SELECT o.id_orden, c.telefono_principal
       FROM ORDEN_SERVICIO o
       JOIN VEHICULO v ON o.id_vehiculo = v.id_vehiculo
       JOIN CLIENTE c ON v.id_cliente = c.id_cliente
       WHERE o.folio = $1`,
      [folio_orden]
    );
    if (orden.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: `El folio ${folio_orden} no existe.` });
    }

    // Teléfono: el indicado, el que venga escrito en "quién llamó", o el del cliente de la orden
    const enTexto = String(cliente_contacto).match(/\+?\d[\d\s\-().]{6,}\d/);
    const tel = recortar(telefono || (enTexto && enTexto[0]) || orden.rows[0].telefono_principal, 20);

    const idEmpleado = await obtenerEmpleado(client, registrado_por, rol);
    const estado = estado_llamada === 'Sí (Atendida)' ? 'Sí (Atendida)' : 'Pendiente';

    const result = await client.query(
      `INSERT INTO BITACORA_LLAMADAS (cliente_contacto, telefono, motivo_llamada, estado_llamada, id_orden, id_empleado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_llamada`,
      [recortar(cliente_contacto, 150), tel, recortar(motivo_llamada, 200), estado, orden.rows[0].id_orden, idEmpleado]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, id_llamada: result.rows[0].id_llamada });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}));

app.patch('/api/llamadas/:id/estatus', ruta(async (req, res) => {
  const { id } = req.params;
  const { estado_llamada } = req.body || {};
  const resultado = await pool.query(
    `UPDATE BITACORA_LLAMADAS SET estado_llamada = $1 WHERE id_llamada = $2`,
    [recortar(estado_llamada, 30), id]
  );
  if (resultado.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Llamada no encontrada.' });
  }
  res.json({ success: true, message: 'Estatus de llamada actualizado' });
}));

// ==========================================================
// CU-05: TRABAJOS ADICIONALES
// ==========================================================
const SQL_EXTRAS = `
  SELECT t.id_adicional, o.folio AS folio_orden, v.placas,
         v.marca || ' ' || v.modelo AS auto,
         c.nombre || ' ' || c.apellidos AS cliente,
         t.descripcion_averia, t.costo_refaccion, t.costo_mano_obra,
         t.estado_autorizacion, t.fecha_hora_autorizacion, t.medio_confirmacion
  FROM TRABAJO_ADICIONAL t
  JOIN ORDEN_SERVICIO o ON t.id_orden = o.id_orden
  JOIN VEHICULO v ON o.id_vehiculo = v.id_vehiculo
  JOIN CLIENTE c ON v.id_cliente = c.id_cliente`;

app.get('/api/trabajos-adicionales', ruta(async (req, res) => {
  const result = await pool.query(`${SQL_EXTRAS} ORDER BY t.id_adicional DESC`);
  res.json(result.rows.map(formatearExtra));
}));

app.post('/api/trabajos-adicionales', ruta(async (req, res) => {
  const { folio_orden, concepto, justificacion } = req.body || {};
  // "costo" se acepta por compatibilidad y se toma como costo de refacción
  const refaccion = Number(req.body?.costo_refaccion ?? req.body?.costo ?? 0);
  const manoObra = Number(req.body?.costo_mano_obra ?? 0);

  if (!folio_orden || !concepto || !concepto.trim()) {
    return res.status(400).json({ success: false, error: 'Indique el folio y el concepto del trabajo adicional.' });
  }
  if (!Number.isFinite(refaccion) || !Number.isFinite(manoObra) || refaccion < 0 || manoObra < 0 || refaccion + manoObra <= 0) {
    return res.status(400).json({ success: false, error: 'Indique un costo válido (refacción y/o mano de obra).' });
  }

  const orden = await pool.query('SELECT id_orden, estado_servicio FROM ORDEN_SERVICIO WHERE folio = $1', [folio_orden]);
  if (orden.rowCount === 0) {
    return res.status(404).json({ success: false, error: `El folio ${folio_orden} no existe.` });
  }
  if (orden.rows[0].estado_servicio === 'Terminado') {
    return res.status(400).json({ success: false, error: 'La orden ya está terminada; no admite trabajos adicionales.' });
  }

  const descripcion = concepto.trim() + (justificacion && justificacion.trim() ? SEPARADOR_JUSTIFICACION + justificacion.trim() : '');

  const result = await pool.query(
    `INSERT INTO TRABAJO_ADICIONAL (descripcion_averia, costo_refaccion, costo_mano_obra, estado_autorizacion, id_orden)
     VALUES ($1, $2, $3, 'Pendiente', $4) RETURNING id_adicional`,
    [descripcion, refaccion, manoObra, orden.rows[0].id_orden]
  );
  res.status(201).json({ success: true, id_adicional: result.rows[0].id_adicional });
}));

app.patch('/api/trabajos-adicionales/:id/autorizar', ruta(async (req, res) => {
  const { id } = req.params;
  const { estado_autorizacion, medio_confirmacion } = req.body || {}; // 'Aprobado' o 'Rechazado'

  if (!['Aprobado', 'Rechazado'].includes(estado_autorizacion)) {
    return res.status(400).json({ success: false, error: 'Estado de autorización no válido.' });
  }
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ success: false, error: 'Identificador no válido.' });
  }

  // Con la orden Terminada el total ya no cambia: no se puede aprobar ni rechazar
  const extra = await pool.query(
    `SELECT o.estado_servicio FROM TRABAJO_ADICIONAL t
     JOIN ORDEN_SERVICIO o ON t.id_orden = o.id_orden WHERE t.id_adicional = $1`,
    [id]
  );
  if (extra.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada.' });
  }
  if (extra.rows[0].estado_servicio === 'Terminado') {
    return res.status(409).json({ success: false, error: 'La orden ya está terminada; la autorización ya no puede modificarse.' });
  }

  const resultado = await pool.query(
    `UPDATE TRABAJO_ADICIONAL
     SET estado_autorizacion = $1, fecha_hora_autorizacion = CURRENT_TIMESTAMP, medio_confirmacion = $2
     WHERE id_adicional = $3`,
    [estado_autorizacion, recortar(medio_confirmacion || 'Sistema', 30), id]
  );
  if (resultado.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada.' });
  }
  res.json({ success: true, message: 'Autorización actualizada correctamente' });
}));

// ==========================================================
// CU-06: PAGOS (efectivo)
// ==========================================================
app.post('/api/pagos', ruta(async (req, res) => {
  const { folio_orden, atendido_por, rol } = req.body || {};
  const descuento = Number(req.body?.descuento ?? 0);
  const montoEsperado = req.body?.monto_total == null ? null : Number(req.body.monto_total);
  const efectivo = req.body?.efectivo_recibido == null ? null : Number(req.body.efectivo_recibido);

  if (!folio_orden) {
    return res.status(400).json({ success: false, error: 'Indique el folio de la orden.' });
  }
  if (!['Recepcionista', 'Administrador'].includes(rol)) {
    return res.status(403).json({ success: false, error: 'Solo Recepción o Administrador pueden registrar pagos.' });
  }
  if (!Number.isFinite(descuento) || descuento < 0) {
    return res.status(400).json({ success: false, error: 'El descuento no es válido.' });
  }

  const orden = await pool.query(
    `SELECT o.id_orden, o.estado_servicio, ${costoBaseSQL()} AS costo_base
     FROM ORDEN_SERVICIO o WHERE o.folio = $1`,
    [folio_orden]
  );
  if (orden.rowCount === 0) {
    return res.status(404).json({ success: false, error: `El folio ${folio_orden} no existe.` });
  }
  if (orden.rows[0].estado_servicio !== 'Terminado') {
    return res.status(400).json({ success: false, error: 'Solo se pueden cobrar órdenes en estatus Terminado.' });
  }
  const idOrden = orden.rows[0].id_orden;

  // El servidor calcula el desglose; no confía en los importes del navegador
  const extras = await pool.query(
    `SELECT COALESCE(SUM(costo_refaccion), 0) AS refacciones, COALESCE(SUM(costo_mano_obra), 0) AS mano_obra
     FROM TRABAJO_ADICIONAL WHERE id_orden = $1 AND estado_autorizacion = 'Aprobado'`,
    [idOrden]
  );
  const costoBase = Number(orden.rows[0].costo_base);
  const subtotalManoObra = redondear(costoBase + Number(extras.rows[0].mano_obra));
  const subtotalRefacciones = redondear(Number(extras.rows[0].refacciones));
  const subtotal = redondear(subtotalManoObra + subtotalRefacciones);

  if (descuento > subtotal) {
    return res.status(400).json({ success: false, error: `El descuento no puede ser mayor al subtotal ($${subtotal.toFixed(2)}).` });
  }
  const total = redondear(subtotal - descuento);

  if (montoEsperado !== null && Math.abs(montoEsperado - total) > 0.01) {
    return res.status(409).json({ success: false, error: `El total cambió (ahora es $${total.toFixed(2)}). Actualice la pantalla e intente de nuevo.` });
  }
  if (efectivo !== null && (!Number.isFinite(efectivo) || efectivo < total)) {
    return res.status(400).json({ success: false, error: 'El efectivo recibido es insuficiente.' });
  }

  // Si un administrador concede el descuento, queda registrado como quien lo autoriza
  const idAdmin = rol === 'Administrador' && descuento > 0
    ? await obtenerEmpleado(pool, atendido_por, 'Administrador')
    : null;

  try {
    const result = await pool.query(
      `INSERT INTO PAGO_SERVICIO (subtotal_refacciones, subtotal_mano_obra, monto_descuento, total_liquidado, id_orden, id_administrador_autoriza)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_pago, to_char(fecha_pago, 'DD/MM/YYYY HH24:MI') AS fecha_pago`,
      [subtotalRefacciones, subtotalManoObra, descuento, total, idOrden, idAdmin]
    );
    res.status(201).json({
      success: true,
      id_pago: result.rows[0].id_pago,
      comprobante: {
        folio: folio_orden,
        fecha_pago: result.rows[0].fecha_pago,
        costo_base: costoBase,
        subtotal_mano_obra: subtotalManoObra,
        subtotal_refacciones: subtotalRefacciones,
        monto_descuento: descuento,
        total_liquidado: total,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'Esta orden ya fue liquidada.' });
    }
    throw error;
  }
}));

app.get('/api/pagos', ruta(async (req, res) => {
  const result = await pool.query(`
    SELECT p.id_pago, o.folio AS folio_orden, v.placas,
           v.marca || ' ' || v.modelo AS auto,
           c.nombre || ' ' || c.apellidos AS cliente,
           to_char(p.fecha_pago, 'DD/MM/YYYY HH24:MI') AS fecha_pago,
           p.total_liquidado AS monto_total,
           p.subtotal_refacciones, p.subtotal_mano_obra, p.monto_descuento,
           a.nombre || ' ' || a.apellidos AS atendido_por
    FROM PAGO_SERVICIO p
    JOIN ORDEN_SERVICIO o ON p.id_orden = o.id_orden
    JOIN VEHICULO v ON o.id_vehiculo = v.id_vehiculo
    JOIN CLIENTE c ON v.id_cliente = c.id_cliente
    LEFT JOIN EMPLEADO a ON p.id_administrador_autoriza = a.id_empleado
    ORDER BY p.fecha_pago DESC, p.id_pago DESC
  `);
  res.json(result.rows);
}));

// ==========================================================
// CU-07: HISTORIAL VEHICULAR
// ==========================================================
app.get('/api/vehiculos/historial', ruta(async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const result = await pool.query(`
    SELECT v.placas, v.marca, v.modelo, v.${COL.anio} AS anio, v.color, v.vin,
           c.nombre || ' ' || c.apellidos AS cliente, c.telefono_principal
    FROM VEHICULO v
    JOIN CLIENTE c ON v.id_cliente = c.id_cliente
    WHERE v.placas ILIKE $1 OR c.nombre ILIKE $1 OR c.apellidos ILIKE $1
       OR (c.nombre || ' ' || c.apellidos) ILIKE $1
    ORDER BY v.id_vehiculo DESC
  `, [`%${q}%`]);
  res.json(result.rows);
}));

// ==========================================================
// Verificación del esquema al arrancar (solo avisa, no modifica nada)
// ==========================================================
async function verificarEsquema() {
  const esperado = {
    cliente: ['id_cliente', 'nombre', 'apellidos', 'telefono_principal', 'telefono_secundario'],
    vehiculo: ['id_vehiculo', 'placas', 'vin', 'marca', 'modelo', 'color', 'id_cliente'],
    empleado: ['id_empleado', 'nombre', 'apellidos', 'rol', 'telefono'],
    orden_servicio: ['id_orden', 'folio', 'fecha_ingreso', 'falla_reportada', 'estado_servicio', 'id_vehiculo', 'id_empleado_recepcion', 'id_mecanico_asignado'],
    inventario_recepcion: ['id_inventario', 'nivel_combustible', 'accesorios_pertenencias', 'id_orden'],
    trabajo_adicional: ['id_adicional', 'descripcion_averia', 'costo_refaccion', 'costo_mano_obra', 'estado_autorizacion', 'fecha_hora_autorizacion', 'medio_confirmacion', 'id_orden'],
    bitacora_llamadas: ['id_llamada', 'fecha_hora', 'cliente_contacto', 'telefono', 'motivo_llamada', 'estado_llamada', 'notas_resolucion', 'id_orden', 'id_empleado'],
    pago_servicio: ['id_pago', 'fecha_pago', 'subtotal_refacciones', 'subtotal_mano_obra', 'monto_descuento', 'total_liquidado', 'id_orden', 'id_administrador_autoriza'],
  };

  try {
    const { rows } = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()`
    );
    const existentes = {};
    rows.forEach(r => {
      if (!existentes[r.table_name]) existentes[r.table_name] = new Set();
      existentes[r.table_name].add(r.column_name);
    });

    // Variantes con ñ según el diagrama
    if (!existentes.vehiculo?.has('anio') && existentes.vehiculo?.has('año')) COL.anio = '"año"';
    if (!existentes.inventario_recepcion?.has('danos_carroceria') && existentes.inventario_recepcion?.has('daños_carroceria')) COL.danos = '"daños_carroceria"';

    const faltantes = [];
    for (const [tabla, columnas] of Object.entries(esperado)) {
      if (!existentes[tabla]) { faltantes.push(`tabla ${tabla}`); continue; }
      columnas.forEach(c => { if (!existentes[tabla].has(c)) faltantes.push(`${tabla}.${c}`); });
    }

    if (faltantes.length) {
      console.warn('⚠️  La base de datos no coincide con el esquema esperado. Faltan:', faltantes.join(', '));
    } else {
      console.log('✅ Esquema de la base de datos verificado correctamente.');
    }
  } catch (error) {
    console.error('❌ No se pudo conectar/verificar la base de datos:', error.message);
  }
}

// Garantiza la columna ORDEN_SERVICIO.costo_base (costo base editable por el mecánico).
// Es un cambio aditivo: no borra ni modifica datos existentes.
async function prepararEsquema() {
  try {
    const existe = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'orden_servicio' AND column_name = 'costo_base'`
    );
    if (existe.rowCount === 0) {
      await pool.query(`ALTER TABLE ORDEN_SERVICIO ADD COLUMN costo_base DECIMAL(12,2) NOT NULL DEFAULT 1500.00`);
      console.log('✅ Se agregó la columna ORDEN_SERVICIO.costo_base (valor inicial 1500.00).');
    }
    hayCostoBase = true;
  } catch (error) {
    console.error('❌ No se pudo preparar ORDEN_SERVICIO.costo_base:', error.message);
    console.error('   Ejecuta manualmente en PostgreSQL:\n   ALTER TABLE ORDEN_SERVICIO ADD COLUMN costo_base DECIMAL(12,2) NOT NULL DEFAULT 1500.00;');
  }
}

const PORT = process.env.PORT || 3000;
(async () => {
  await prepararEsquema();
  await verificarEsquema();
  app.listen(PORT, () => console.log(`Servidor MotorPlus corriendo en http://localhost:${PORT}`));
})();