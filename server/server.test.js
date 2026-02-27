/**
 * @file server.test.js
 * @description Pruebas unitarias para todos los endpoints del servidor.
 * Cubre casos normales, casos de error y casos límite.
 * Utiliza Jest como framework de pruebas y Supertest para simular peticiones HTTP.
 * El pool de base de datos es mockeado para evitar dependencias externas.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Definir variables de entorno antes de cargar la app
process.env.SERVER_PORT = '0';
process.env.JWT_SECRET = 'secreto_de_prueba_123';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'Admin123.';
process.env.HOST = 'localhost';

// Mockear el pool de base de datos para no necesitar una conexión real
jest.mock('./config/db', () => ({ query: jest.fn() }));

const pool = require('./config/db');
const app = require('./server');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Genera un token JWT válido para usar en pruebas de rutas protegidas.
 * @param {string} usuario - Nombre de usuario a incluir en el payload.
 * @returns {string} Token JWT firmado con el secreto de prueba.
 */
const generarToken = (usuario) =>
    jwt.sign({ id: 1, usuario }, JWT_SECRET, { expiresIn: '1h' });

// =====================================================================
// REGISTRO - POST /register
// =====================================================================

describe('POST /register', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso normal: registro exitoso con contraseña válida
    test('caso normal: registra un usuario correctamente', async () => {
        pool.query
            .mockResolvedValueOnce([[]])          // usuario no existe
            .mockResolvedValueOnce([{ insertId: 1 }]); // insert ok

        const res = await request(app)
            .post('/register')
            .send({ usuario: 'nuevoUsuario', contrasena: 'Segura1!' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('USUARIO_REGISTRADO');
    });

    // Caso de error: faltan campos obligatorios
    test('error: faltan datos en el body', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'solo_usuario' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('FALTAN_DATOS');
    });

    // Caso de error: contraseña demasiado corta (menos de 8 caracteres)
    test('error: contraseña con menos de 8 caracteres', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario1', contrasena: 'Aa1!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_LONGITUD_INVALIDA');
    });

    // Caso de error: contraseña sin letra minúscula
    test('error: contraseña sin letra minúscula', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario1', contrasena: 'MAYUSCULA1!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_SIN_MINUSCULA');
    });

    // Caso de error: contraseña sin letra mayúscula
    test('error: contraseña sin letra mayúscula', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario1', contrasena: 'minuscula1!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_SIN_MAYUSCULA');
    });

    // Caso de error: contraseña sin número
    test('error: contraseña sin número', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario1', contrasena: 'SinNumero!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_SIN_NUMERO');
    });

    // Caso de error: contraseña sin carácter especial
    test('error: contraseña sin carácter especial', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario1', contrasena: 'SinEspecial1' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_SIN_ESPECIAL');
    });

    // Caso de error: usuario ya registrado
    test('error: el nombre de usuario ya existe', async () => {
        pool.query.mockResolvedValueOnce([[{ id: 1, usuario: 'existente' }]]);

        const res = await request(app)
            .post('/register')
            .send({ usuario: 'existente', contrasena: 'Segura1!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('USUARIO_YA_EXISTE');
    });

    // Caso límite: contraseña con exactamente 8 caracteres (mínimo permitido)
    test('límite: contraseña de exactamente 8 caracteres es aceptada', async () => {
        pool.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 2 }]);

        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario2', contrasena: 'Abcde1!x' }); // 8 chars

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('USUARIO_REGISTRADO');
    });

    // Caso límite: contraseña de 7 caracteres (por debajo del mínimo)
    test('límite: contraseña de 7 caracteres es rechazada', async () => {
        const res = await request(app)
            .post('/register')
            .send({ usuario: 'usuario3', contrasena: 'Abc1!xy' }); // 7 chars

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_LONGITUD_INVALIDA');
    });
});

// =====================================================================
// LOGIN - POST /login
// =====================================================================

describe('POST /login', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso normal: login exitoso con credenciales correctas
    test('caso normal: login exitoso y devuelve token', async () => {
        const hashed = await bcrypt.hash('Segura1!', 10);
        pool.query.mockResolvedValueOnce([[{ id: 1, usuario: 'usuario1', contra: hashed }]]);

        const res = await request(app)
            .post('/login')
            .send({ usuario: 'usuario1', contrasena: 'Segura1!' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('LOGIN_EXITOSO');
        expect(res.body.token).toBeDefined();
    });

    // Caso de error: faltan campos obligatorios
    test('error: faltan datos en el body', async () => {
        const res = await request(app)
            .post('/login')
            .send({ usuario: 'usuario1' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('FALTAN_DATOS');
    });

    // Caso de error: usuario no existe en la base de datos
    test('error: usuario no encontrado', async () => {
        pool.query.mockResolvedValueOnce([[]]); // sin resultados

        const res = await request(app)
            .post('/login')
            .send({ usuario: 'noExiste', contrasena: 'Segura1!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('USUARIO_NO_ENCONTRADO');
    });

    // Caso de error: contraseña incorrecta
    test('error: contraseña incorrecta', async () => {
        const hashed = await bcrypt.hash('Segura1!', 10);
        pool.query.mockResolvedValueOnce([[{ id: 1, usuario: 'usuario1', contra: hashed }]]);

        const res = await request(app)
            .post('/login')
            .send({ usuario: 'usuario1', contrasena: 'Incorrecta1!' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('PASSWORD_INCORRECTA');
    });

    // Caso límite: body completamente vacío
    test('límite: body vacío devuelve error de datos faltantes', async () => {
        const res = await request(app)
            .post('/login')
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('FALTAN_DATOS');
    });
});

// =====================================================================
// MIDDLEWARE validarToken
// =====================================================================

describe('Middleware validarToken (via GET /perfil)', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso de error: sin encabezado Authorization
    test('error: solicitud sin token devuelve 401', async () => {
        const res = await request(app).get('/perfil');

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('TOKEN_REQUERIDO');
    });

    // Caso de error: token inválido o manipulado
    test('error: token inválido devuelve 401', async () => {
        const res = await request(app)
            .get('/perfil')
            .set('Authorization', 'Bearer token.falso.invalido');

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('TOKEN_INVALIDO');
    });

    // Caso normal: token válido permite el acceso
    test('caso normal: token válido permite acceso al perfil', async () => {
        const token = generarToken('usuario1');

        const res = await request(app)
            .get('/perfil')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('ACCESO_PERMITIDO');
        expect(res.body.usuario).toBe('usuario1');
    });

    // Caso límite: token expirado
    test('límite: token expirado devuelve 401', async () => {
        const tokenExpirado = jwt.sign(
            { id: 1, usuario: 'usuario1' },
            JWT_SECRET,
            { expiresIn: '1ms' }
        );
        await new Promise((r) => setTimeout(r, 10)); // esperar que expire

        const res = await request(app)
            .get('/perfil')
            .set('Authorization', `Bearer ${tokenExpirado}`);

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('TOKEN_INVALIDO');
    });
});

// =====================================================================
// TAREAS - GET /tareas
// =====================================================================

describe('GET /tareas', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso normal: devuelve la lista de tareas del usuario
    test('caso normal: devuelve las tareas del usuario autenticado', async () => {
        const tareas = [
            { id_tarea: 1, titulo: 'Tarea 1', prioridad: 2, estado: 1, fecha_limite: '2026-03-01', usuario_id: 1 }
        ];
        pool.query.mockResolvedValueOnce([tareas]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .get('/tareas')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].titulo).toBe('Tarea 1');
    });

    // Caso normal: lista vacía cuando el usuario no tiene tareas
    test('caso normal: devuelve arreglo vacío si no hay tareas', async () => {
        pool.query.mockResolvedValueOnce([[]]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .get('/tareas')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    // Caso de error: sin token de autenticación
    test('error: sin token devuelve 401', async () => {
        const res = await request(app).get('/tareas');
        expect(res.statusCode).toBe(401);
    });
});

// =====================================================================
// TAREAS - POST /tareas
// =====================================================================

describe('POST /tareas', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso normal: crea una tarea correctamente
    test('caso normal: crea una tarea y devuelve el id', async () => {
        pool.query
            .mockResolvedValueOnce([[{ id: 1 }]])         // SELECT usuario_id
            .mockResolvedValueOnce([{ insertId: 5 }]);    // INSERT tarea

        const token = generarToken('usuario1');
        const res = await request(app)
            .post('/tareas')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Nueva tarea', prioridad: 1, estado: 1, fecha_limite: '2026-04-01' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('TAREA_CREADA');
        expect(res.body.id_tarea).toBe(5);
    });

    // Caso normal: tarea creada con descripción opcional
    test('caso normal: crea tarea con descripción opcional', async () => {
        pool.query
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ insertId: 6 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .post('/tareas')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Con desc', descripcion: 'Mi descripción', prioridad: 3, estado: 2, fecha_limite: '2026-05-01' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('TAREA_CREADA');
    });

    // Caso de error: faltan campos obligatorios
    test('error: faltan datos obligatorios', async () => {
        const token = generarToken('usuario1');
        const res = await request(app)
            .post('/tareas')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Sin fecha' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('FALTAN_DATOS');
    });

    // Caso de error: sin autenticación
    test('error: sin token devuelve 401', async () => {
        const res = await request(app)
            .post('/tareas')
            .send({ titulo: 'Tarea', prioridad: 1, estado: 1, fecha_limite: '2026-04-01' });

        expect(res.statusCode).toBe(401);
    });

    // Caso límite: título con un solo carácter
    test('límite: título de un carácter es aceptado', async () => {
        pool.query
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ insertId: 7 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .post('/tareas')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'X', prioridad: 1, estado: 1, fecha_limite: '2026-04-01' });

        expect(res.statusCode).toBe(200);
    });
});

// =====================================================================
// TAREAS - PUT /tareas/:id
// =====================================================================

describe('PUT /tareas/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso normal: actualización exitosa
    test('caso normal: actualiza la tarea correctamente', async () => {
        pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .put('/tareas/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Actualizada', prioridad: 2, estado: 2, fecha_limite: '2026-06-01' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('TAREA_ACTUALIZADA');
    });

    // Caso de error: tarea no encontrada o no pertenece al usuario
    test('error: tarea no encontrada devuelve 404', async () => {
        pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .put('/tareas/999')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'X', prioridad: 1, estado: 1, fecha_limite: '2026-04-01' });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('TAREA_NO_ENCONTRADA');
    });

    // Caso de error: sin autenticación
    test('error: sin token devuelve 401', async () => {
        const res = await request(app)
            .put('/tareas/1')
            .send({ titulo: 'X', prioridad: 1, estado: 1, fecha_limite: '2026-04-01' });

        expect(res.statusCode).toBe(401);
    });
});

// =====================================================================
// TAREAS - DELETE /tareas/:id
// =====================================================================

describe('DELETE /tareas/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    // Caso normal: eliminación exitosa
    test('caso normal: elimina la tarea correctamente', async () => {
        pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .delete('/tareas/1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('TAREA_ELIMINADA');
    });

    // Caso de error: tarea no encontrada
    test('error: tarea no encontrada devuelve 404', async () => {
        pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .delete('/tareas/999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('TAREA_NO_ENCONTRADA');
    });

    // Caso de error: sin autenticación
    test('error: sin token devuelve 401', async () => {
        const res = await request(app).delete('/tareas/1');
        expect(res.statusCode).toBe(401);
    });

    // Caso límite: id no numérico en los parámetros
    test('límite: id no numérico, no se encuentra la tarea', async () => {
        pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

        const token = generarToken('usuario1');
        const res = await request(app)
            .delete('/tareas/abc')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
    });
});
