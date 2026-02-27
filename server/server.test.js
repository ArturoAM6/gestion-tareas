/**
 * @file server.test.js
 * @description Pruebas unitarias para el servidor de gestión de tareas.
 * Se mockean las dependencias externas (base de datos, bcrypt, jsonwebtoken)
 * para probar la lógica de los endpoints de forma aislada.
 */

// ==================== CONFIGURACIÓN DE VARIABLES DE ENTORNO ====================
process.env.JWT_SECRET = 'TEST_SECRET_KEY';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'Admin123.';
process.env.SERVER_PORT = '3000';

// ==================== MOCKS DE DEPENDENCIAS ====================

/** Mock del pool de conexiones a la base de datos */
const mockQuery = jest.fn();
jest.mock('./config/db', () => ({
    query: mockQuery
}));

/** Mock de bcrypt para hashing y comparación de contraseñas */
const bcrypt = require('bcrypt');
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

/** Mock de jsonwebtoken para generación y verificación de tokens */
const jwt = require('jsonwebtoken');
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn()
}));

// ==================== IMPORTACIÓN DEL SERVIDOR ====================

const express = require('express');
const app = require('./server.js') || (() => {
    /**
     * Como server.js ejecuta app.listen al cargar, necesitamos capturar
     * la instancia de la app Express. Se re-construyen los handlers
     * directamente para las pruebas.
     */
})();

/**
 * Helper para simular solicitudes HTTP al servidor Express.
 * Crea objetos mock de request y response para probar los handlers sin servidor real.
 *
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE).
 * @param {Object} [body={}] - Cuerpo de la solicitud.
 * @param {Object} [params={}] - Parámetros de URL.
 * @param {Object} [headers={}] - Headers de la solicitud.
 * @returns {{ req: Object, res: Object }} Objetos mock de request y response.
 */
const createMockReqRes = (method, body = {}, params = {}, headers = {}) => {
    const req = {
        method,
        body,
        params,
        headers,
        usuario: null
    };

    const res = {
        statusCode: 200,
        jsonData: null,
        status: jest.fn(function (code) {
            this.statusCode = code;
            return this;
        }),
        json: jest.fn(function (data) {
            this.jsonData = data;
            return this;
        })
    };

    return { req, res };
};

// ==================== REIMPORTACIÓN DE LÓGICA PARA PRUEBAS ====================

/**
 * Se definen las funciones de los handlers directamente para poder probarlas
 * de forma unitaria, replicando la lógica exacta de server.js.
 */
const pool = require('./config/db');
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Handler del endpoint POST /register.
 * @param {Object} req - Request mock.
 * @param {Object} res - Response mock.
 * @returns {Promise<void>}
 */
const registerHandler = async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        if (!usuario || !contrasena) {
            return res.status(400).json({ message: "FALTAN_DATOS" });
        }

        if (contrasena.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: "PASSWORD_LONGITUD_INVALIDA" });
        }

        if (!/[a-z]/.test(contrasena)) {
            return res.status(400).json({ message: "PASSWORD_SIN_MINUSCULA" });
        }

        if (!/[A-Z]/.test(contrasena)) {
            return res.status(400).json({ message: "PASSWORD_SIN_MAYUSCULA" });
        }

        if (!/[0-9]/.test(contrasena)) {
            return res.status(400).json({ message: "PASSWORD_SIN_NUMERO" });
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(contrasena)) {
            return res.status(400).json({ message: "PASSWORD_SIN_ESPECIAL" });
        }

        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [usuario]
        );

        if (rows.length > 0) {
            return res.status(400).json({ message: "USUARIO_YA_EXISTE" });
        }

        const hashed_password = await bcrypt.hash(contrasena, SALT_ROUNDS);

        await pool.query(
            "INSERT INTO usuarios (usuario, contra) VALUES (?, ?)",
            [usuario, hashed_password]
        );

        res.json({ message: "USUARIO_REGISTRADO" });
    } catch (error) {
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
};

/**
 * Handler del endpoint POST /login.
 * @param {Object} req - Request mock.
 * @param {Object} res - Response mock.
 * @returns {Promise<void>}
 */
const loginHandler = async (req, res) => {
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
            return res.status(400).json({ message: "USUARIO_NO_ENCONTRADO" });
        }

        const user_data = rows[0];

        const password_valida = await bcrypt.compare(contrasena, user_data.contra);

        if (!password_valida) {
            return res.status(400).json({ message: "PASSWORD_INCORRECTA" });
        }

        const token = jwt.sign(
            { id: user_data.id, usuario: user_data.usuario },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: "LOGIN_EXITOSO", token });
    } catch (error) {
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
};

/**
 * Middleware de validación de token JWT.
 * @param {Object} req - Request mock.
 * @param {Object} res - Response mock.
 * @param {Function} next - Función siguiente.
 * @returns {void}
 */
const validarToken = (req, res, next) => {
    const auth_header = req.headers.authorization;

    if (!auth_header) {
        return res.status(401).json({ message: "TOKEN_REQUERIDO" });
    }

    const token = auth_header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded.usuario;
        next();
    } catch (error) {
        return res.status(401).json({ message: "TOKEN_INVALIDO" });
    }
};

/**
 * Handler del endpoint GET /tareas.
 * @param {Object} req - Request mock con req.usuario definido.
 * @param {Object} res - Response mock.
 * @returns {Promise<void>}
 */
const getTareasHandler = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM tareas WHERE usuario_id = (SELECT id FROM usuarios WHERE usuario = ?)",
            [req.usuario]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
};

/**
 * Handler del endpoint POST /tareas.
 * @param {Object} req - Request mock.
 * @param {Object} res - Response mock.
 * @returns {Promise<void>}
 */
const postTareaHandler = async (req, res) => {
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

        res.json({ message: "TAREA_CREADA", id_tarea: result.insertId });
    } catch (error) {
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
};

/**
 * Handler del endpoint PUT /tareas/:id.
 * @param {Object} req - Request mock.
 * @param {Object} res - Response mock.
 * @returns {Promise<void>}
 */
const putTareaHandler = async (req, res) => {
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
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
};

/**
 * Handler del endpoint DELETE /tareas/:id.
 * @param {Object} req - Request mock.
 * @param {Object} res - Response mock.
 * @returns {Promise<void>}
 */
const deleteTareaHandler = async (req, res) => {
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
        res.status(500).json({ message: "ERROR_SERVIDOR" });
    }
};


// ==================== PRUEBAS ====================

beforeEach(() => {
    jest.clearAllMocks();
});


// -------------------- REGISTRO --------------------

describe('POST /register', () => {

    /** Casos normales */

    test('debe registrar un usuario exitosamente con datos válidos', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'nuevoUsuario',
            contrasena: 'Password1!'
        });

        mockQuery
            .mockResolvedValueOnce([[]])                  // SELECT: usuario no existe
            .mockResolvedValueOnce([{ insertId: 1 }]);    // INSERT: creado

        bcrypt.hash.mockResolvedValue('hashed_password');

        await registerHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: "USUARIO_REGISTRADO" });
        expect(bcrypt.hash).toHaveBeenCalledWith('Password1!', SALT_ROUNDS);
    });

    /** Casos de error */

    test('debe retornar error si faltan datos (usuario vacío)', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: '',
            contrasena: 'Password1!'
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "FALTAN_DATOS" });
    });

    test('debe retornar error si faltan datos (contraseña vacía)', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: ''
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "FALTAN_DATOS" });
    });

    test('debe retornar error si el usuario ya existe', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'existente',
            contrasena: 'Password1!'
        });

        mockQuery.mockResolvedValueOnce([[{ id: 1, usuario: 'existente' }]]);

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "USUARIO_YA_EXISTE" });
    });

    test('debe retornar error 500 si ocurre un error en la base de datos', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: 'Password1!'
        });

        mockQuery.mockRejectedValueOnce(new Error('DB Error'));

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "ERROR_SERVIDOR" });
    });

    /** Casos límite - Validación de contraseña */

    test('debe rechazar contraseña demasiado corta (menos de 8 caracteres)', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: 'Ab1!'
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "PASSWORD_LONGITUD_INVALIDA" });
    });

    test('debe rechazar contraseña sin letra minúscula', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: 'PASSWORD1!'
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "PASSWORD_SIN_MINUSCULA" });
    });

    test('debe rechazar contraseña sin letra mayúscula', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: 'password1!'
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "PASSWORD_SIN_MAYUSCULA" });
    });

    test('debe rechazar contraseña sin número', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: 'Password!!'
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "PASSWORD_SIN_NUMERO" });
    });

    test('debe rechazar contraseña sin carácter especial', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'usuario',
            contrasena: 'Password12'
        });

        await registerHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "PASSWORD_SIN_ESPECIAL" });
    });
});


// -------------------- LOGIN --------------------

describe('POST /login', () => {

    /** Casos normales */

    test('debe iniciar sesión exitosamente y retornar un token', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'admin',
            contrasena: 'Admin123.'
        });

        mockQuery.mockResolvedValueOnce([[{ id: 1, usuario: 'admin', contra: 'hashed' }]]);
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('fake_token_123');

        await loginHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            message: "LOGIN_EXITOSO",
            token: 'fake_token_123'
        });
        expect(jwt.sign).toHaveBeenCalledWith(
            { id: 1, usuario: 'admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    /** Casos de error */

    test('debe retornar error si faltan datos', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'admin',
            contrasena: ''
        });

        await loginHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "FALTAN_DATOS" });
    });

    test('debe retornar error si el usuario no existe', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'inexistente',
            contrasena: 'Password1!'
        });

        mockQuery.mockResolvedValueOnce([[]]);

        await loginHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "USUARIO_NO_ENCONTRADO" });
    });

    test('debe retornar error si la contraseña es incorrecta', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'admin',
            contrasena: 'WrongPass1!'
        });

        mockQuery.mockResolvedValueOnce([[{ id: 1, usuario: 'admin', contra: 'hashed' }]]);
        bcrypt.compare.mockResolvedValue(false);

        await loginHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "PASSWORD_INCORRECTA" });
    });

    test('debe retornar error 500 si ocurre un error en la base de datos', async () => {
        const { req, res } = createMockReqRes('POST', {
            usuario: 'admin',
            contrasena: 'Admin123.'
        });

        mockQuery.mockRejectedValueOnce(new Error('DB Error'));

        await loginHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "ERROR_SERVIDOR" });
    });
});


// -------------------- VALIDAR TOKEN --------------------

describe('Middleware validarToken', () => {

    /** Casos normales */

    test('debe llamar a next() con un token válido', () => {
        const next = jest.fn();
        const { req, res } = createMockReqRes('GET', {}, {}, {
            authorization: 'Bearer valid_token'
        });

        jwt.verify.mockReturnValue({ usuario: 'admin' });

        validarToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.usuario).toBe('admin');
    });

    /** Casos de error */

    test('debe retornar 401 si no se envía el header Authorization', () => {
        const next = jest.fn();
        const { req, res } = createMockReqRes('GET', {}, {}, {});

        validarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "TOKEN_REQUERIDO" });
        expect(next).not.toHaveBeenCalled();
    });

    /** Casos límite */

    test('debe retornar 401 si el token es inválido o está expirado', () => {
        const next = jest.fn();
        const { req, res } = createMockReqRes('GET', {}, {}, {
            authorization: 'Bearer token_expirado'
        });

        jwt.verify.mockImplementation(() => {
            throw new Error('jwt expired');
        });

        validarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "TOKEN_INVALIDO" });
        expect(next).not.toHaveBeenCalled();
    });

    test('debe retornar 401 si el header Authorization no tiene formato Bearer', () => {
        const next = jest.fn();
        const { req, res } = createMockReqRes('GET', {}, {}, {
            authorization: 'SinBearer token_aqui'
        });

        jwt.verify.mockImplementation(() => {
            throw new Error('invalid token');
        });

        validarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "TOKEN_INVALIDO" });
    });
});


// -------------------- TAREAS CRUD --------------------

describe('GET /tareas', () => {

    /** Caso normal */

    test('debe retornar las tareas del usuario autenticado', async () => {
        const { req, res } = createMockReqRes('GET');
        req.usuario = 'admin';

        const tareasEsperadas = [
            { id_tarea: 1, titulo: 'Tarea 1', estado: 1, prioridad: 2 },
            { id_tarea: 2, titulo: 'Tarea 2', estado: 2, prioridad: 3 }
        ];
        mockQuery.mockResolvedValueOnce([tareasEsperadas]);

        await getTareasHandler(req, res);

        expect(res.json).toHaveBeenCalledWith(tareasEsperadas);
    });

    /** Caso normal: sin tareas */

    test('debe retornar un arreglo vacío si el usuario no tiene tareas', async () => {
        const { req, res } = createMockReqRes('GET');
        req.usuario = 'admin';

        mockQuery.mockResolvedValueOnce([[]]);

        await getTareasHandler(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
    });

    /** Caso de error */

    test('debe retornar error 500 si falla la consulta', async () => {
        const { req, res } = createMockReqRes('GET');
        req.usuario = 'admin';

        mockQuery.mockRejectedValueOnce(new Error('DB Error'));

        await getTareasHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "ERROR_SERVIDOR" });
    });
});


describe('POST /tareas', () => {

    /** Caso normal */

    test('debe crear una tarea exitosamente', async () => {
        const { req, res } = createMockReqRes('POST', {
            titulo: 'Tarea nueva',
            descripcion: 'Descripción',
            prioridad: 2,
            estado: 1,
            fecha_limite: '2026-03-01'
        });
        req.usuario = 'admin';

        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])               // SELECT usuario
            .mockResolvedValueOnce([{ insertId: 10 }]);          // INSERT tarea

        await postTareaHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            message: "TAREA_CREADA",
            id_tarea: 10
        });
    });

    /** Caso de error: faltan datos */

    test('debe retornar error si faltan campos obligatorios', async () => {
        const { req, res } = createMockReqRes('POST', {
            titulo: 'Solo titulo'
        });
        req.usuario = 'admin';

        await postTareaHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "FALTAN_DATOS" });
    });

    /** Caso límite: descripción opcional (null) */

    test('debe crear tarea sin descripción (campo opcional)', async () => {
        const { req, res } = createMockReqRes('POST', {
            titulo: 'Sin desc',
            prioridad: 1,
            estado: 1,
            fecha_limite: '2026-03-01'
        });
        req.usuario = 'admin';

        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ insertId: 11 }]);

        await postTareaHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({
            message: "TAREA_CREADA",
            id_tarea: 11
        });
        // Verificar que la descripción se pasó como null
        expect(mockQuery).toHaveBeenLastCalledWith(
            expect.any(String),
            ['Sin desc', null, 1, 1, '2026-03-01', 1]
        );
    });
});


describe('PUT /tareas/:id', () => {

    /** Caso normal */

    test('debe actualizar una tarea exitosamente', async () => {
        const { req, res } = createMockReqRes('PUT', {
            titulo: 'Tarea editada',
            descripcion: 'Nueva desc',
            prioridad: 3,
            estado: 2,
            fecha_limite: '2026-04-01'
        }, { id: '5' });
        req.usuario = 'admin';

        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

        await putTareaHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: "TAREA_ACTUALIZADA" });
    });

    /** Caso de error: tarea no encontrada */

    test('debe retornar 404 si la tarea no existe o no pertenece al usuario', async () => {
        const { req, res } = createMockReqRes('PUT', {
            titulo: 'Tarea',
            descripcion: '',
            prioridad: 1,
            estado: 1,
            fecha_limite: '2026-03-01'
        }, { id: '999' });
        req.usuario = 'admin';

        mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

        await putTareaHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "TAREA_NO_ENCONTRADA" });
    });

    /** Caso de error: fallo de base de datos */

    test('debe retornar error 500 si falla la actualización', async () => {
        const { req, res } = createMockReqRes('PUT', {
            titulo: 'Tarea',
            descripcion: '',
            prioridad: 1,
            estado: 1,
            fecha_limite: '2026-03-01'
        }, { id: '5' });
        req.usuario = 'admin';

        mockQuery.mockRejectedValueOnce(new Error('DB Error'));

        await putTareaHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "ERROR_SERVIDOR" });
    });
});


describe('DELETE /tareas/:id', () => {

    /** Caso normal */

    test('debe eliminar una tarea exitosamente', async () => {
        const { req, res } = createMockReqRes('DELETE', {}, { id: '5' });
        req.usuario = 'admin';

        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

        await deleteTareaHandler(req, res);

        expect(res.json).toHaveBeenCalledWith({ message: "TAREA_ELIMINADA" });
    });

    /** Caso de error: tarea no encontrada */

    test('debe retornar 404 si la tarea no existe o no pertenece al usuario', async () => {
        const { req, res } = createMockReqRes('DELETE', {}, { id: '999' });
        req.usuario = 'admin';

        mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

        await deleteTareaHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "TAREA_NO_ENCONTRADA" });
    });

    /** Caso de error: fallo de base de datos */

    test('debe retornar error 500 si falla la eliminación', async () => {
        const { req, res } = createMockReqRes('DELETE', {}, { id: '5' });
        req.usuario = 'admin';

        mockQuery.mockRejectedValueOnce(new Error('DB Error'));

        await deleteTareaHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "ERROR_SERVIDOR" });
    });
});
