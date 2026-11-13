# TallerMP - Sistema de Gestión de Taller Automotriz

## Bloque 1. Información general del proyecto

### Propósito

Sistema web *full-stack* para la digitalización y gestión del proceso de admisión de vehículos, recepción física, generación de órdenes de servicio y control de acceso por roles en un taller automotriz.

### Integrantes

- Daniela Michelle Vargas Estrada

### Stack tecnológico y versiones

| Elemento | Tecnología y versión |
|---|---|
| Backend | Node.js (v18.0 o superior) y Express.js (`express` ^4.x) |
| Base de datos | PostgreSQL (v14 o superior, base de datos `Taller-MotorPlus-BD`) |
| Controlador y entorno BD | Node-postgres (`pg` ^8.x), `cors` (^2.x) y `dotenv` (^16.x) |
| Frontend | HTML5, CSS3, Tailwind CSS (v3 vía CDN) y JavaScript (ES6+) |
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

- **Node.js:** v18.0.0 o superior (incluye `npm` v9+).
- **Dependencias del backend:** `express` (^4.x), `pg` (^8.x), `cors` (^2.x) y `dotenv` (^16.x).
- **Motor de base de datos:** PostgreSQL v14 o superior.
- **Administrador de base de datos:** pgAdmin 4 (v7 o superior) o terminal `psql`.
- **Herramientas de desarrollo:** Visual Studio Code y Git.
- **Navegador web moderno:** Google Chrome, Microsoft Edge o Mozilla Firefox (con conexión a internet para cargar Tailwind CSS CDN).

### Pasos y comandos para la ejecución

**1. Clonar el repositorio**

```bash
git clone [https://github.com/daniestrada273-crypto/Taller-MotoPLus.git](https://github.com/daniestrada273-crypto/Taller-MotoPLus.git)
cd Taller-MotoPLus