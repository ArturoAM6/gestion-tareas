create database if not exists gestor;

use gestor;

-- Tabla para almacenar los usuarios del sistema --
create table usuarios (
    id int auto_increment primary key,
    usuario varchar(50) not null,
    contra varchar(12) not null
);

-- Tabla para almacenar las tareas de los usuarios --
create table tareas (
    id_tarea int auto_increment primary key,
    titulo varchar(50) not null,
    descripcion text null,
    prioridad int not null, -- 1 baja, 2 media, 3 alta--
    estado int not null, -- 1 pendiente, 2 en progreso, 3 completada --
    fecha_limite date not null, -- YYYY-MM-DD --
    usuario_id int not null,
    foreign key (usuario_id) references usuarios (id)
);

INSERT INTO usuarios (usuario, contra) VALUES ('admin', 'Admin123.');
-- Usuario de prueba para acceder al sistema --