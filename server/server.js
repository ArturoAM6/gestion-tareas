const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');

dotenv.config();

const app = express();


// CONSTANTES
const PORT = process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 10;

if (!JWT_SECRET) throw new Error('JWT_SECRET no definido en variables de entorno');


// MIDDLEWARE
app.use(cors());
app.use(express.json());


/**
 * Crea el usuario administrador en la base de datos si aún no existe.
 * Lee las credenciales exclusivamente desde las variables de entorno
 * ADMIN_USER y ADMIN_PASSWORD para evitar datos sensibles en el código.
 * @returns {Promise<void>}
 */
const seedAdmin = async () => {
    try {
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASSWORD;

        // Validar que las variables de entorno estén definidas
        if (!adminUser || !adminPass) {
            throw new Error('ADMIN_USER y ADMIN_PASSWORD deben estar definidos en variables de entorno');
        }

        // Verificar si el admin ya existe en la base de datos
        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [adminUser]
        );

        if (rows.length === 0) {
            // Hashear la contraseña antes de guardarla
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
 * Registra un nuevo usuario en el sistema.
 * Valida que la contraseña cumpla los requisitos de seguridad:
 * longitud mínima, mayúscula, minúscula, número y carácter especial.
 * @param {import('express').Request} req - Objeto de solicitud con { usuario, contrasena } en el body.
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>}
 */
app.post('/register', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        // Verificar que se envíen los campos requeridos
        if (!usuario || !contrasena) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        // Validar longitud mínima de la contraseña
        if (contrasena.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                message: "PASSWORD_LONGITUD_INVALIDA"
            });
        }

        // Validar presencia de letra minúscula
        if (!/[a-z]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_MINUSCULA"
            });
        }

        // Validar presencia de letra mayúscula
        if (!/[A-Z]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_MAYUSCULA"
            });
        }

        // Validar presencia de al menos un número
        if (!/[0-9]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_NUMERO"
            });
        }

        // Validar presencia de al menos un carácter especial
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(contrasena)) {
            return res.status(400).json({
                message: "PASSWORD_SIN_ESPECIAL"
            });
        }

        // Verificar que el nombre de usuario no esté ya registrado
        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (rows.length > 0) {
            return res.status(400).json({
                message: "USUARIO_YA_EXISTE"
            });
        }

        // Hashear la contraseña antes de persistirla
        const hashed_password = await bcrypt.hash(
            contrasena,
            SALT_ROUNDS
        );

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
 * Autentica a un usuario y devuelve un token JWT con validez de 1 hora.
 * Verifica la contraseña usando bcrypt para una comparación segura.
 * @param {import('express').Request} req - Objeto de solicitud con { usuario, contrasena } en el body.
 * @param {import('express').Response} res - Objeto de respuesta HTTP con el token JWT si el login es exitoso.
 * @returns {Promise<void>}
 */
app.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        // Verificar que se envíen los campos requeridos
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

        // Comparar la contraseña enviada con el hash almacenado
        const password_valida = await bcrypt.compare(
            contrasena,
            user_data.contra
        );

        if (!password_valida) {
            return res.status(400).json({
                message: "PASSWORD_INCORRECTA"
            });
        }

        // Generar token JWT firmado con el secreto de entorno
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
 * Middleware que valida el token JWT en el encabezado Authorization.
 * Si el token es válido, adjunta el nombre de usuario decodificado en req.usuario
 * y cede el control al siguiente middleware o controlador de ruta.
 * @param {import('express').Request} req - Objeto de solicitud; debe incluir el header Authorization: Bearer <token>.
 * @param {import('express').Response} res - Objeto de respuesta HTTP.
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware.
 * @returns {void}
 */
const validarToken = (req, res, next) => {
    const auth_header = req.headers.authorization;

    // Verificar que el encabezado Authorization esté presente
    if (!auth_header) {
        return res.status(401).json({
            message: "TOKEN_REQUERIDO"
        });
    }

    // Extraer el token del esquema "Bearer <token>"
    const token = auth_header.split(" ")[1];

    try {
        // Verificar y decodificar el token con el secreto de entorno
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
 * Devuelve todas las tareas pertenecientes al usuario autenticado.
 * @param {import('express').Request} req - Objeto de solicitud; req.usuario proviene del token JWT validado.
 * @param {import('express').Response} res - Objeto de respuesta HTTP con el arreglo de tareas.
 * @returns {Promise<void>}
 */
app.get('/tareas', validarToken, async (req, res) => {
    try {
        // Obtener todas las tareas asociadas al usuario autenticado
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
 * Crea una nueva tarea asociada al usuario autenticado.
 * @param {import('express').Request} req - Objeto de solicitud con { titulo, descripcion, prioridad, estado, fecha_limite } en el body.
 * @param {import('express').Response} res - Objeto de respuesta HTTP con el id de la tarea creada.
 * @returns {Promise<void>}
 */
app.post('/tareas', validarToken, async (req, res) => {
    try {
        const { titulo, descripcion, prioridad, estado, fecha_limite } = req.body;

        // Verificar que los campos obligatorios estén presentes
        if (!titulo || !prioridad || !estado || !fecha_limite) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        // Obtener el id interno del usuario autenticado
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
 * Actualiza los datos de una tarea existente del usuario autenticado.
 * Solo actualiza la tarea si pertenece al usuario que realiza la solicitud.
 * @param {import('express').Request} req - Objeto de solicitud con { titulo, descripcion, prioridad, estado, fecha_limite } en el body y el id de la tarea en los params.
 * @param {import('express').Response} res - Objeto de respuesta HTTP confirmando la actualización.
 * @returns {Promise<void>}
 */
app.put('/tareas/:id', validarToken, async (req, res) => {
    try {
        const { titulo, descripcion, prioridad, estado, fecha_limite } = req.body;
        const { id } = req.params;

        // Actualizar solo si la tarea pertenece al usuario autenticado
        const [result] = await pool.query(
            "UPDATE tareas SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, fecha_limite = ? WHERE id_tarea = ? AND usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [titulo, descripcion || null, prioridad, estado, fecha_limite, id, req.usuario]
        );

        // Si no se afectó ninguna fila, la tarea no existe o no pertenece al usuario
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
 * Elimina una tarea del usuario autenticado por su id.
 * Solo elimina la tarea si pertenece al usuario que realiza la solicitud.
 * @param {import('express').Request} req - Objeto de solicitud con el id de la tarea en los params.
 * @param {import('express').Response} res - Objeto de respuesta HTTP confirmando la eliminación.
 * @returns {Promise<void>}
 */
app.delete('/tareas/:id', validarToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Eliminar solo si la tarea pertenece al usuario autenticado
        const [result] = await pool.query(
            "DELETE FROM tareas WHERE id_tarea = ? AND usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [id, req.usuario]
        );

        // Si no se afectó ninguna fila, la tarea no existe o no pertenece al usuario
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
 * Devuelve el nombre del usuario autenticado.
 * Sirve para verificar que el token JWT sigue siendo válido.
 * @param {import('express').Request} req - Objeto de solicitud; req.usuario proviene del token JWT validado.
 * @param {import('express').Response} res - Objeto de respuesta HTTP con el nombre de usuario.
 * @returns {void}
 */
app.get('/perfil', validarToken, (req, res) => {
    res.json({
        message: "ACCESO_PERMITIDO",
        usuario: req.usuario
    });
});

// Iniciar el servidor solo cuando el archivo se ejecuta directamente (no en pruebas)
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`SERVIDOR_CORRIENDO_EN_PUERTO_${PORT}`);
        await seedAdmin();
    });
}

module.exports = app;