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
const JWT_SECRET = process.env.JWT_SECRET || "SECRETO_SUPER_SEGURO";
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 10;


// MIDDLEWARE
app.use(cors());
app.use(express.json());


// SEED: Crear usuario admin si no existe
const seedAdmin = async () => {
    try {
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD || 'Admin123.';

        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [adminUser]
        );

        if (rows.length === 0) {
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


// REGISTRO
app.post('/register', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        if (!usuario || !contrasena) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        if (
            contrasena.length < MIN_PASSWORD_LENGTH ||
            contrasena.length > MAX_PASSWORD_LENGTH
        ) {
            return res.status(400).json({
                message: "PASSWORD_LONGITUD_INVALIDA"
            });
        }

        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (rows.length > 0) {
            return res.status(400).json({
                message: "USUARIO_YA_EXISTE"
            });
        }

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


// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        if (!usuario || !contrasena) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

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

        const password_valida = await bcrypt.compare(
            contrasena,
            user_data.contra
        );

        if (!password_valida) {
            return res.status(400).json({
                message: "PASSWORD_INCORRECTA"
            });
        }

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


// MIDDLEWARE VALIDAR TOKEN
const validarToken = (req, res, next) => {
    const auth_header = req.headers.authorization;

    if (!auth_header) {
        return res.status(401).json({
            message: "TOKEN_REQUERIDO"
        });
    }

    const token = auth_header.split(" ")[1];

    try {
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

// OBTENER TAREAS DEL USUARIO
app.get('/tareas', validarToken, async (req, res) => {
    try {
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

// CREAR TAREA
app.post('/tareas', validarToken, async (req, res) => {
    try {
        const { titulo, descripcion, prioridad, estado, fecha_limite } = req.body;

        if (!titulo || !prioridad || !estado || !fecha_limite) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        const [userRows] = await pool.query(
            "SELECT id FROM usuarios WHERE usuario = ?",
            [req.usuario]
        );

        const usuario_id = userRows[0].id;

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

// ACTUALIZAR TAREA
app.put('/tareas/:id', validarToken, async (req, res) => {
    try {
        const { titulo, descripcion, prioridad, estado, fecha_limite } = req.body;
        const { id } = req.params;

        const [result] = await pool.query(
            "UPDATE tareas SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, fecha_limite = ? WHERE id_tarea = ? AND usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [titulo, descripcion || null, prioridad, estado, fecha_limite, id, req.usuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "TAREA_NO_ENCONTRADA" });
        }

        res.json({ message: "TAREA_ACTUALIZADA" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});

// ELIMINAR TAREA
app.delete('/tareas/:id', validarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM tareas WHERE id_tarea = ? AND usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [id, req.usuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "TAREA_NO_ENCONTRADA" });
        }

        res.json({ message: "TAREA_ELIMINADA" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
});


// PERFIL PROTEGIDO
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