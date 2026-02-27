const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');

dotenv.config();

const app = express();


// CONSTANTES
/** @constant {number} PORT - Puerto en el que se ejecuta el servidor, definido en las variables de entorno */
const PORT = process.env.SERVER_PORT || 3000;

/** @constant {string} JWT_SECRET - Clave secreta para firmar y verificar tokens JWT, debe definirse en .env */
const JWT_SECRET = process.env.JWT_SECRET;

/** @constant {number} SALT_ROUNDS - Número de rondas de sal utilizadas por bcrypt para el hashing de contraseñas */
const SALT_ROUNDS = 10;

/** @constant {number} MIN_PASSWORD_LENGTH - Longitud mínima requerida para las contraseñas de usuario */
const MIN_PASSWORD_LENGTH = 8;

/** @constant {number} MAX_PASSWORD_LENGTH - Longitud máxima permitida para las contraseñas de usuario */
const MAX_PASSWORD_LENGTH = 10;


// MIDDLEWARE
app.use(cors());
app.use(express.json());


/**
 * Crea el usuario administrador inicial si no existe en la base de datos.
 * Consulta la tabla de usuarios buscando el nombre de admin definido en las
 * variables de entorno; si no lo encuentra, genera un hash de la contraseña
 * con bcrypt y lo inserta como nuevo registro.
 *
 * @async
 * @returns {Promise<void>} No retorna valor; imprime en consola el resultado de la operación.
 */
const seedAdmin = async () => {
    try {
        // Obtener credenciales del administrador desde variables de entorno
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASSWORD;

        // Verificar si el usuario administrador ya existe en la base de datos
        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [adminUser]
        );

        if (rows.length === 0) {
            // Hashear la contraseña antes de almacenarla para mayor seguridad
            const hashed = await bcrypt.hash(adminPass, SALT_ROUNDS);
            await pool.query(
                "INSERT INTO usuarios (usuario, contra) VALUES (?, ?)",
                [adminUser, hashed]
            );
            console.log('USUARIO_ADMIN_CREADO');
        } else {
            console.log('USUARIO_ADMIN_YA_EXISTE');
        }
    } catch (error) {
        console.error('ERROR_SEED_ADMIN:', error.message);
    }
};


/**
 * Endpoint de registro de nuevos usuarios.
 * Valida que se proporcionen usuario y contraseña, verifica que la contraseña
 * cumpla con los requisitos de complejidad (longitud mínima, mayúsculas,
 * minúsculas, números y caracteres especiales), comprueba que el usuario no
 * exista previamente y, de ser válido, hashea la contraseña con bcrypt y
 * almacena el nuevo registro en la base de datos.
 *
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {string} req.body.usuario - Nombre de usuario a registrar.
 * @param {string} req.body.contrasena - Contraseña del nuevo usuario.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito o error.
 */
app.post('/register', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        // Validar que ambos campos estén presentes
        if (!usuario || !contrasena) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        // Verificar longitud mínima de la contraseña
        if (contrasena.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                message: "PASSWORD_LONGITUD_INVALIDA"
            });
        }

        // Verificar que contenga al menos una letra minúscula
        if (!/[a-z]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_MINUSCULA"
            });
        }

        // Verificar que contenga al menos una letra mayúscula
        if (!/[A-Z]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_MAYUSCULA"
            });
        }

        // Verificar que contenga al menos un dígito numérico
        if (!/[0-9]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_NUMERO"
            });
        }

        // Verificar que contenga al menos un carácter especial
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_ESPECIAL"
            });
        }

        // Comprobar si el nombre de usuario ya está registrado
        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (rows.length > 0) {
            return res.status(400).json({
                message: "USUARIO_YA_EXISTE"
            });
        }

        // Hashear la contraseña con bcrypt antes de guardarla
        const hashed_password = await bcrypt.hash(
            contrasena,
            SALT_ROUNDS
        );

        // Insertar el nuevo usuario en la base de datos
        await pool.query(
            "INSERT INTO usuarios (usuario, contra) VALUES (?, ?)",
            [usuario, hashed_password]
        );

        res.json({ message: "USUARIO_REGISTRADO" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});


/**
 * Endpoint de inicio de sesión.
 * Verifica que se proporcionen las credenciales, busca el usuario en la base
 * de datos, compara la contraseña proporcionada con el hash almacenado usando
 * bcrypt y, si es válida, genera un token JWT con el id y nombre de usuario
 * que expira en 1 hora.
 *
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {string} req.body.usuario - Nombre de usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} Respuesta JSON con mensaje y token JWT en caso de éxito, o mensaje de error.
 */
app.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        // Validar que ambos campos estén presentes
        if (!usuario || !contrasena) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        // Buscar el usuario en la base de datos
        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                message: "USUARIO_NO_ENCONTRADO"
            });
        }

        const user_data = rows[0];

        // Comparar la contraseña proporcionada con el hash almacenado
        const password_valida = await bcrypt.compare(
            contrasena,
            user_data.contra
        );

        if (!password_valida) {
            return res.status(400).json({
                message: "PASSWORD_INCORRECTA"
            });
        }

        // Generar token JWT con el id y nombre de usuario, expira en 1 hora
        const token = jwt.sign(
            { id: user_data.id, usuario: user_data.usuario },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: "LOGIN_EXITOSO",
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});


/**
 * Middleware para validar el token JWT en las rutas protegidas.
 * Extrae el token del header Authorization (formato "Bearer <token>"),
 * lo verifica con la clave secreta JWT_SECRET y, si es válido, adjunta
 * el nombre de usuario decodificado al objeto de solicitud para su uso
 * en los siguientes middlewares o controladores.
 *
 * @param {Object} req - Objeto de solicitud Express.
 * @param {string} req.headers.authorization - Header con el token en formato "Bearer <token>".
 * @param {Object} res - Objeto de respuesta Express.
 * @param {Function} next - Función para pasar al siguiente middleware.
 * @returns {void|Object} Llama a next() si el token es válido, o retorna error 401.
 */
const validarToken = (req, res, next) => {
    const auth_header = req.headers.authorization;

    // Verificar que se envió el header de autorización
    if (!auth_header) {
        return res.status(401).json({
            message: "TOKEN_REQUERIDO"
        });
    }

    // Extraer el token del formato "Bearer <token>"
    const token = auth_header.split(" ")[1];

    try {
        // Verificar y decodificar el token JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded.usuario;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "TOKEN_INVALIDO"
        });
    }
};


// ==================== TAREAS CRUD ====================

/**
 * Obtiene todas las tareas del usuario autenticado.
 * Consulta la tabla de tareas filtrando por el id del usuario que corresponde
 * al nombre de usuario extraído del token JWT.
 *
 * @param {Object} req - Objeto de solicitud Express (con req.usuario del middleware validarToken).
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Array<Object>} Respuesta JSON con el arreglo de tareas del usuario.
 */
app.get('/tareas', validarToken, async (req, res) => {
    try {
        // Consultar tareas asociadas al usuario autenticado
        const [rows] = await pool.query(
            "SELECT * FROM tareas WHERE usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [req.usuario]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});

/**
 * Crea una nueva tarea para el usuario autenticado.
 * Valida que se proporcionen los campos requeridos (titulo, prioridad, estado,
 * fecha_limite), obtiene el id del usuario desde la base de datos y registra
 * la tarea con los datos proporcionados.
 *
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {string} req.body.titulo - Título de la tarea (requerido).
 * @param {string} [req.body.descripcion] - Descripción de la tarea (opcional).
 * @param {number} req.body.prioridad - Nivel de prioridad (1=baja, 2=media, 3=alta).
 * @param {number} req.body.estado - Estado de la tarea (1=pendiente, 2=en progreso, 3=completada).
 * @param {string} req.body.fecha_limite - Fecha límite en formato YYYY-MM-DD.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito y el id de la tarea creada.
 */
app.post('/tareas', validarToken, async (req, res) => {
    try {
        const { titulo, descripcion, prioridad, estado, fecha_limite } = req.body;

        // Validar que los campos obligatorios estén presentes
        if (!titulo || !prioridad || !estado || !fecha_limite) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        // Obtener el id numérico del usuario autenticado
        const [userRows] = await pool.query(
            "SELECT id FROM usuarios WHERE usuario = ?",
            [req.usuario]
        );

        const usuario_id = userRows[0].id;

        // Insertar la nueva tarea en la base de datos
        const [result] = await pool.query(
            "INSERT INTO tareas (titulo, descripcion, prioridad, estado, fecha_limite, usuario_id) VALUES (?, ?, ?, ?, ?, ?)",
            [titulo, descripcion || null, prioridad, estado, fecha_limite, usuario_id]
        );

        res.json({
            message: "TAREA_CREADA",
            id_tarea: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});

/**
 * Actualiza una tarea existente del usuario autenticado.
 * Recibe los campos actualizados y modifica la tarea identificada por su id,
 * verificando que pertenezca al usuario autenticado mediante una subconsulta.
 *
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} req.params - Parámetros de la URL.
 * @param {string} req.params.id - ID de la tarea a actualizar.
 * @param {Object} req.body - Cuerpo de la solicitud con los campos a actualizar.
 * @param {string} req.body.titulo - Título actualizado de la tarea.
 * @param {string} [req.body.descripcion] - Descripción actualizada (opcional).
 * @param {number} req.body.prioridad - Prioridad actualizada.
 * @param {number} req.body.estado - Estado actualizado.
 * @param {string} req.body.fecha_limite - Fecha límite actualizada.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito o error 404 si no se encontró.
 */
app.put('/tareas/:id', validarToken, async (req, res) => {
    try {
        const { titulo, descripcion, prioridad, estado, fecha_limite } = req.body;
        const { id } = req.params;

        // Actualizar la tarea solo si pertenece al usuario autenticado
        const [result] = await pool.query(
            "UPDATE tareas SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, fecha_limite = ? WHERE id_tarea = ? AND usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [titulo, descripcion || null, prioridad, estado, fecha_limite, id, req.usuario]
        );

        // Verificar si se encontró y actualizó la tarea
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "TAREA_NO_ENCONTRADA" });
        }

        res.json({ message: "TAREA_ACTUALIZADA" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});

/**
 * Elimina una tarea del usuario autenticado.
 * Elimina el registro de la tarea identificada por su id, verificando que
 * pertenezca al usuario autenticado mediante una subconsulta.
 *
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} req.params - Parámetros de la URL.
 * @param {string} req.params.id - ID de la tarea a eliminar.
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} Respuesta JSON con mensaje de éxito o error 404 si no se encontró.
 */
app.delete('/tareas/:id', validarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Eliminar la tarea solo si pertenece al usuario autenticado
        const [result] = await pool.query(
            "DELETE FROM tareas WHERE id_tarea = ? AND usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [id, req.usuario]
        );

        // Verificar si se encontró y eliminó la tarea
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "TAREA_NO_ENCONTRADA" });
        }

        res.json({ message: "TAREA_ELIMINADA" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});


/**
 * Endpoint protegido que retorna los datos del perfil del usuario autenticado.
 * Utiliza el middleware validarToken para verificar la autenticación y
 * responde con el nombre de usuario extraído del token JWT.
 *
 * @param {Object} req - Objeto de solicitud Express (con req.usuario del middleware).
 * @param {Object} res - Objeto de respuesta Express.
 * @returns {Object} Respuesta JSON con mensaje de acceso permitido y el nombre del usuario.
 */
app.get('/perfil', validarToken, (req, res) => {
    res.json({
        message: "ACCESO_PERMITIDO",
        usuario: req.usuario
    });
});

app.listen(PORT, async () => {
    console.log(`SERVIDOR_CORRIENDO_EN_PUERTO_${PORT}`);
    await seedAdmin();
});