
# TallerMP - Sistema de Gestión de Taller Automotriz

## Bloque 1. Información general del proyecto

### Propósito

Sistema web *full-stack* para la digitalización y gestión del proceso de admisión de vehículos, recepción física, generación de órdenes de servicio y control de acceso por roles en un taller automotriz.

### Integrantes

- Daniela Michelle Vargas Estrada
- [Nombre de la segunda integrante]

### Stack tecnológico y versiones

| Elemento | Tecnología |
|---|---|
| Backend | Node.js (v18+) y Express.js |
| Base de datos | PostgreSQL (`Taller-MotorPlus-BD`) |
| Controlador de BD | Node-postgres (`pg` v8.x) |
| Frontend | HTML5, CSS3, Tailwind CSS y JavaScript nativo |
| Entorno de desarrollo | Visual Studio Code |
| Administración de BD | pgAdmin 4 |
| Control de versiones | Git y GitHub |

### Estado de E1

Entrega 1 funcional con backend activo en Node.js, interfaz web responsiva, conexión a PostgreSQL y persistencia relacional de datos para órdenes de servicio y autenticación por roles.

---

## Bloque 2. Instalación y ejecución del proyecto

### Requisitos previos

- Node.js instalado.
- PostgreSQL instalado.
- pgAdmin 4.
- Git instalado.
- Visual Studio Code.

### Pasos y comandos para la ejecución

**1. Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/Taller-MotoPlus.git
cd Taller-MotoPlus
```

**2. Instalar las dependencias del backend**

Ingresar a la carpeta del backend:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

**3. Crear y preparar la base de datos**

- Crear la base de datos `Taller-MotorPlus-BD` desde pgAdmin 4 o mediante la terminal de PostgreSQL.
- Abrir la herramienta *Query Tool* de pgAdmin.
- Abrir y ejecutar el archivo `schema.sql`, ubicado en la raíz del repositorio.
- Verificar la creación de las tablas y sus relaciones.

Tablas principales:

- CLIENTE
- VEHICULO
- INVENTARIO_RECEPCION
- ORDEN_SERVICIO

**4. Configurar los parámetros de conexión**

La configuración de conexión a PostgreSQL se encuentra definida directamente en el archivo `server.js`.

Parámetros de conexión:

- Host: `localhost`
- Puerto: `5432`
- Base de datos: `Taller-MotorPlus-BD`
- Usuario: Usuario configurado en PostgreSQL.
- Contraseña: Contraseña correspondiente al usuario.

**5. Iniciar el servidor backend**

Desde la carpeta `backend`, ejecutar:

```bash
node server.js
```

El servidor iniciará en el puerto local configurado, por ejemplo:

```text
http://localhost:3000
```

---

## Bloque 3. Demostración técnica y datos de prueba

### Acceso a la aplicación

1. Abrir el archivo `index.html` ubicado en la carpeta del frontend.
2. También se puede utilizar la extensión *Live Server* de Visual Studio Code para visualizar la interfaz en el navegador.

### Autenticación

Ingresar al sistema utilizando las credenciales y los roles de prueba disponibles, por ejemplo:

- Recepcionista.
- Mecánico.

### Carga e inserción de datos de prueba

1. Completar el formulario de recepción vehicular con datos ficticios.
2. Registrar la información del cliente:
   - Nombre.
   - Número de teléfono.
3. Registrar la información del vehículo:
   - Marca.
   - Modelo.
   - Placas.
4. Introducir la descripción de la falla reportada.
5. Hacer clic en el botón **Registrar Orden de Servicio** para enviar la petición HTTP POST al backend.

### Comprobación de persistencia

Para verificar que los datos fueron almacenados correctamente:

1. Abrir pgAdmin 4.
2. Conectarse a la base de datos `Taller-MotorPlus-BD`.
3. Abrir *Query Tool*.
4. Ejecutar la siguiente consulta SQL:

```sql
SELECT * FROM orden_servicio;
```

5. Comprobar que los registros enviados desde la interfaz web aparezcan correctamente en la base de datos.

---

## Control de versiones

El proyecto utiliza Git y GitHub para administrar el código fuente, registrar cambios y facilitar la colaboración entre los integrantes del equipo.

La carpeta `node_modules/` se encuentra excluida del seguimiento de Git mediante el archivo `.gitignore`. Cada integrante puede instalar las dependencias localmente ejecutando `npm install` dentro de la carpeta `backend`.
