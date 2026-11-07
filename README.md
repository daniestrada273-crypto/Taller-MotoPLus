# Taller-MotoPLus
\## Integrantes
Vargas Estrada Daniela Michelle

Plataforma web para la administración de recepción vehicular, órdenes de servicio y control de reparaciones para talleres mecánicos.

\## Objetivo del Proyecto

MotorPlus es una aplicación web diseñada para digitalizar y optimizar la administración de talleres automotrices. El sistema permite gestionar el registro de clientes, la información de sus vehículos y el seguimiento detallado de las órdenes de servicio en tiempo real.


\## Usuarios

\- \*\* Recepción:\*\* Encargados de dar de alta clientes, registrar vehículos y crear o actualizar el estado de las órdenes de servicio.

\- \*\*Técnicos / Mecánicos:\*\* Personal responsable de consultar las fallas reportadas y actualizar los avances en las reparaciones.
\- \*\*Administrador: Encargado revisión de historial vehicular y consultar estado del vehiculo

\## Funcionalidades del Sistema

MotorPlus incluye los siguientes módulos y capacidades para la administración integral del taller:

\### Gestión de Clientes

\- Registro y edición: Alta de clientes con datos de contacto (nombre, teléfono, correo).

\- Historial de servicios: Consulta detallada de todos los servicios realizados y vehículos asociados a cada cliente.

\### Control de Vehículos

\- Expediente vehicular: Registro de automóviles asociados a un cliente específico (marca, modelo, año y placas).

\- Búsqueda rápida: Identificación de vehículos mediante número de placa o propietario.


\### Órdenes de Servicio

\- Creación de órdenes: Registro de la recepción del vehículo con la descripción del problema reportado.

\- Seguimiento de estados: Control del flujo de trabajo (Pendiente, En Proceso, Diagnosticado, Finalizado, Entregado).

\- Asignación de diagnóstico: Registro de las fallas encontradas y el trabajo técnico a realizar.


\### Base de Datos Relacional (PostgreSQL)

\- Integridad de datos: Relaciones estructuradas entre clientes, vehículos y órdenes de trabajo mediante llaves foráneas.

\- Persistencia y respaldo: Esquema optimizado para la gestión eficiente de la información del taller.

\###Control de Acceso y Autenticación por Roles
-Pantalla de inicio de sesión que permite autenticar diferentes tipos de usuarios (Recepcionista, Mecánico y Administrador), delimitando los permisos y módulos de trabajo correspondientes.

\## 📋 Requisitos Previos
Antes de comenzar, asegúrate de tener instalado el siguiente software en tu computadora

\* \*\*\[Node.js](https://nodejs.org/)\*\* (Versión 18.x o superior)

\* \*\*\[PostgreSQL](https://www.postgresql.org/)\*\* (Servidor activo en el puerto local 5432)

\* \*\*\[pgAdmin 4](https://www.pgadmin.org/)\*\* (O cualquier cliente de PostgreSQL de tu preferencia)

\* \*\*\[Git](https://git-scm.com/)\*\*

\* \*\*\[Visual Studio Code]\*\* (Recomendado)


\## Guía de Instalación Paso a Paso

\### 1. Clonar el Repositorio

\-Abre tu terminal o consola de comandos y clona el proyecto desde GitHub:

\-git clone https://github.com/daniestrada273-crypto/Taller-MotoPLus

\-cd Taller-MotoPlus

\### 2. Crea una nueva base de datos llamada exactamente: Taller-MotorPlus-BD
\-Ejecuta el script SQL principal del proyecto (ubicado en database/schema.sql
\### 3. Instalar Dependencias del Backend
\-Entra a la carpeta del servidor/backend e instala las librerías necesarias ejecutando:

\- cd backend
\- npm install
\### 4. Configurar Variables de Entorno y Conexión
\- Verifica que las credenciales de conexión en tu archivo server.js
\- Host: localhost

\- Puerto: 5432

\-Base de datos: Taller-MotorPlus-BD

\-Usuario: (Tu usuario de PostgreSQL, por ejemplo postgres)

\-Contraseña: (Tu contraseña de PostgreSQL)
\### 5. Iniciar el Servidor Backend
\-Dentro de la carpeta backend, ejecuta:
\-node server.js

\### 6. Abre el archivo index.html
\- LISTOOO