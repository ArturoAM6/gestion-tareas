/**
 * @module config/db
 * @description Módulo de configuración de la conexión a la base de datos MySQL.
 * Crea y exporta un pool de conexiones utilizando mysql2/promise,
 * configurado a través de variables de entorno definidas en el archivo .env.
 */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Pool de conexiones a la base de datos MySQL.
 * Utiliza las variables de entorno HOST, DB_PORT, USER, PASSWORD y DATABASE
 * para configurar la conexión. El pool permite reutilizar conexiones activas
 * y gestionar múltiples consultas concurrentes de forma eficiente.
 *
 * @type {import('mysql2/promise').Pool}
 */
const pool = mysql.createPool({
    host: process.env.HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

module.exports = pool;