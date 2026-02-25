const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');

dotenv.config();

const app = express();


// CONSTANTES
const PORT = 3000;
const JWT_SECRET = "SECRETO_SUPER_SEGURO";
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 10;


// MIDDLEWARE
app.use(cors());
app.use(express.json());


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
            "INSERT INTO usuarios (usuario, contrasenas) VALUES (?, ?)",
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
            user_data.contrasenas
        );

        if (!password_valida) {
            return res.status(400).json({
                message: "PASSWORD_INCORRECTA"
            });
        }

        const token = jwt.sign(
            { usuario: user_data.usuario },
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


// PERFIL PROTEGIDO
app.get('/perfil', validarToken, (req, res) => {
    res.json({
        message: "ACCESO_PERMITIDO",
        usuario: req.usuario
    });
});

app.listen(PORT, () => {
    console.log(`SERVIDOR_CORRIENDO_EN_PUERTO_${PORT}`);
});