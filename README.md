# Taller-MotoPLus
\## Integrantes
Vargas Estrada Daniela Michelle
Vázquez Mejía Anali

Plataforma web para la administración de recepción vehicular, órdenes de servicio y control de reparaciones para talleres mecánicos.



\## Objetivo del Proyecto

MotorPlus es una aplicación web diseñada para digitalizar y optimizar la administración de talleres automotrices. El sistema permite gestionar el registro de clientes, la información de sus vehículos y el seguimiento detallado de las órdenes de servicio en tiempo real.



\## Usuarios

\- \*\*Administrador / Recepción:\*\* Encargados de dar de alta clientes, registrar vehículos y crear o actualizar el estado de las órdenes de servicio.

\- \*\*Técnicos / Mecánicos:\*\* Personal responsable de consultar las fallas reportadas y actualizar los avances en las reparaciones.



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
\-Pantalla de inicio de sesión que permite autenticar diferentes tipos de usuarios (Recepcionista, Mecánico y Administrador), delimitando los permisos y módulos de trabajo correspondientes.
