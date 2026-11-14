# TallerMP - Sistema de Gestión de Taller Automotriz

## Bloque 1. Información general del proyecto

### Propósito

Sistema web *full-stack* para la digitalización y gestión del proceso de admisión de vehículos, recepción física, generación de órdenes de servicio y control de acceso por roles en un taller automotriz.

### Integrantes

- Daniela Michelle Vargas Estrada

### Stack tecnológico y versiones

| Elemento | Tecnología |
|---|---|
| Backend | Node.js (v18) y Express.js |
| Base de datos | PostgreSQL (`Taller-MotorPlus-BD`) |
| Controlador de BD | Node-postgres (`pg` v8.x) |
| Frontend | HTML5, CSS3, Tailwind CSS y JavaScript nativo |
| Entorno de desarrollo | Visual Studio Code |
| Administración de BD | pgAdmin 4 |
| Control de versiones | Git y GitHub |

### Módulos del sistema

| Módulo | Descripción | Roles |
|---|---|---|
| CU-01 Recepción | Registro de cliente, vehículo, inventario y orden de servicio. Genera el acceso del cliente. | Recepcionista, Administrador |
| CU-02 Estatus | Consulta del estatus del vehículo por placas o folio. | Todos (el cliente solo ve su vehículo) |
| CU-03 Bitácora | Registro de llamadas relacionadas con una orden. | Recepcionista, Administrador |
| CU-04 Bahía | Cambio de fase del servicio y costo base del servicio (solo antes de Terminado). | Mecánico |
| CU-05 Extras | Solicitud de trabajos adicionales y autorización del cliente. | Mecánico, Cliente, Recepción |
| CU-06 Pagos | Cobro en efectivo con comprobante (mano de obra, refacciones, descuento y total). | Recepcionista, Administrador |
| CU-07 Historial | Expediente de órdenes, extras y pagos por vehículo. | Recepcionista, Administrador |

### Estado de E1

Entrega 1 funcional con backend activo en Node.js, interfaz web responsiva, conexión a PostgreSQL y persistencia relacional de datos para órdenes de servicio y autenticación por roles.

---

## Bloque 2. Instalación y ejecución del proyecto

### Requisitos previos

- Node.js 18.
- PostgreSQL instalado.
- pgAdmin 4.
- Git instalado.
- Visual Studio Code.

### Pasos y comandos para la ejecución

**1. Clonar el repositorio**

```bash
git clone https://github.com/daniestrada273-crypto/Taller-MotoPLus.git
cd Taller-MotoPLus
```

**2. Instalar las dependencias del backend**

```bash
cd backend
npm install
```

Las dependencias son `express`, `pg` y `cors`. Si el proyecto no tuviera `package.json`, se instalan con `npm install express pg cors`.

**3. Crear y preparar la base de datos**

El archivo `schema.sql`, ubicado en la raíz del repositorio, crea la base de datos `Taller-MotorPlus-BD` y todas sus tablas. Hay dos formas de ejecutarlo:

- **Con `psql` (SQL Shell):** desde la raíz del repositorio ejecutar `psql -U postgres -f schema.sql`. El script crea la base de datos, se conecta a ella con `\c` y crea las tablas.
- **Con pgAdmin 4:** crear la base de datos `Taller-MotorPlus-BD`, conectarse a ella, abrir *Query Tool* y ejecutar el contenido de `schema.sql` desde la primera sentencia `CREATE TABLE` en adelante (pgAdmin no admite el comando `\c`).

Verificar la creación de las tablas y sus relaciones.

Tablas del sistema:

- CLIENTE
- VEHICULO
- EMPLEADO
- ORDEN_SERVICIO
- INVENTARIO_RECEPCION
- TRABAJO_ADICIONAL
- BITACORA_LLAMADAS
- PAGO_SERVICIO

Al iniciar, el servidor agrega por sí solo la columna `costo_base` a `ORDEN_SERVICIO` si no existe (valor inicial 1500.00). No borra ni modifica datos existentes.

**4. Configurar los parámetros de conexión (sin contraseñas en el código)**

El servidor lee la conexión a PostgreSQL desde variables de entorno. Ninguna credencial se guarda en el repositorio.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PGHOST` | Servidor de PostgreSQL | `localhost` |
| `PGPORT` | Puerto | `5432` |
| `PGDATABASE` | Base de datos | `Taller-MotorPlus-BD` |
| `PGUSER` | Usuario de PostgreSQL | `postgres` |
| `PGPASSWORD` | Contraseña del usuario (obligatoria, se define en tu equipo) | *(sin valor por defecto)* |

Definir las variables antes de iniciar el servidor (la contraseña es la de tu propia instalación de PostgreSQL):

PowerShell (Windows):

```powershell
$env:PGPASSWORD="<tu-contraseña>"
```

CMD (Windows):

```cmd
set PGPASSWORD=<tu-contraseña>
```

Linux / macOS:

```bash
export PGPASSWORD="<tu-contraseña>"
```

**5. Iniciar el servidor backend**

Desde la carpeta `backend`, en la misma terminal donde se definieron las variables:

```bash
node server.js
```

El servidor iniciará en `http://localhost:3000` y mostrará en consola si el esquema de la base de datos es correcto.

---

## Bloque 3. Demostración técnica y datos de prueba

### Acceso a la aplicación

1. Con el servidor iniciado, abrir el archivo `index.html` (en la raíz del repositorio) en el navegador.
2. También se puede utilizar la extensión *Live Server* de Visual Studio Code.

### Autenticación

En la pantalla de inicio se elige el rol de prueba:

- **Recepcionista, Mecánico y Administrador:** se selecciona el rol en la pantalla de inicio.
- **Cliente:** usuario = placas del vehículo y contraseña = teléfono principal capturado en la orden. Estos datos se muestran en el comprobante al registrar la orden.

### Carga e inserción de datos de prueba

1. Con el rol Recepcionista, completar el formulario de recepción vehicular con datos ficticios.
2. Registrar la información del cliente: nombre, apellidos y teléfono.
3. Registrar la información del vehículo: marca, modelo, año, placas y color.
4. Indicar el nivel de gasolina y la descripción de la falla reportada.
5. Hacer clic en el botón de registro para enviar la petición HTTP POST al backend. El sistema devuelve un folio con formato `MP-AAAA-XXXX`.

### Comprobación de persistencia

Para verificar que los datos fueron almacenados correctamente:

1. Abrir pgAdmin 4 y conectarse a `Taller-MotorPlus-BD`.
2. Abrir *Query Tool* y ejecutar:

```sql
SELECT o.folio, v.placas, c.nombre, c.apellidos, o.estado_servicio, o.fecha_ingreso
FROM ORDEN_SERVICIO o
JOIN VEHICULO v ON o.id_vehiculo = v.id_vehiculo
JOIN CLIENTE c ON v.id_cliente = c.id_cliente
ORDER BY o.fecha_ingreso DESC
LIMIT 5;
```

3. Comprobar que el folio y los datos capturados en la interfaz aparezcan en la base de datos.
4. Detener y volver a iniciar `node server.js`, y recargar el navegador: la orden debe seguir visible.

---

## Control de versiones

El proyecto utiliza Git y GitHub para administrar el código fuente, registrar cambios y facilitar la colaboración entre los integrantes del equipo.

La carpeta `node_modules/` se encuentra excluida del seguimiento de Git mediante el archivo `.gitignore`. Cada integrante puede instalar las dependencias localmente ejecutando `npm install` dentro de la carpeta `backend`.