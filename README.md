# 📝 API de Tareas con Node.js, Express y MySQL

Trabajo práctico — Tecnicatura Universitaria en Programación (UTN)
**Alumna:** [Tu nombre y apellido]

API REST para registrarse, iniciar sesión y administrar tareas personales. Cada usuario ve y modifica **solo sus propias tareas**. Parte del código de autenticación de la clase 17 (bcrypt + JWT), lo organiza en capas y reemplaza SQLite por MySQL.

---

## 🧰 Tecnologías

- **Node.js** (ES Modules)
- **Express 4**: servidor y rutas
- **MySQL 8** con **mysql2/promise**: base de datos y pool de conexiones
- **bcrypt**: hash de contraseñas
- **jsonwebtoken**: tokens de sesión (JWT)
- **dotenv**: variables de entorno

---

## 📁 Estructura del proyecto

```
proyecto-tareas/
├── .env.example          <- plantilla de datos sensibles (copiar a .env)
├── .gitignore
├── package.json
├── database/
│   └── schema.sql        <- crea la base, las tablas y el usuario tareas_app
└── src/
    ├── server.js         <- verifica la conexión a MySQL y hace app.listen
    ├── app.js            <- arma la app de Express
    ├── config/
    │   └── db.js         <- pool de conexiones a MySQL
    ├── routes/           <- asocian URL + método con un controlador
    │   ├── auth.routes.js
    │   └── tareas.routes.js
    ├── middlewares/      <- controles que se repiten
    │   ├── requiereAutenticacion.js
    │   └── manejarErrores.js
    ├── controllers/      <- leen req, validan y eligen el código HTTP
    │   ├── auth.controller.js
    │   └── tareas.controller.js
    └── models/           <- consultas SQL
        ├── usuarios.model.js
        └── tareas.model.js
```

### ¿Por qué separar en capas?

La idea es que **cada archivo tenga un solo motivo para cambiar**:

| Capa | Se encarga de | No debería |
|---|---|---|
| `routes/` | asociar URL + método a un controlador | tener lógica ni SQL |
| `middlewares/` | controles que se repiten (auth, errores) | saber de una tabla en particular |
| `controllers/` | leer `req`, validar, elegir el código HTTP | escribir SQL |
| `models/` | las consultas a la base | conocer `req`, `res` ni códigos HTTP |
| `config/` | conexiones y configuración compartida | tener datos sensibles escritos a mano |

---

## 🔄 Cómo viaja un pedido

```
Ruta → Middleware → Controlador → Modelo → MySQL
```

Ejemplo con `POST /tareas`:

1. `app.js` recibe el pedido, `express.json()` arma `req.body` y deriva la URL `/tareas` a `tareas.routes.js`.
2. `tareas.routes.js` aplica `requiereAutenticacion` a todas sus rutas y manda el pedido al controlador `crear`.
3. `requiereAutenticacion` verifica el token del header `Authorization`. Si es válido, guarda `{ id, email }` en `req.usuario`; si no, responde 401.
4. `tareas.controller.js` valida el texto (400 si falta) y llama al modelo con `req.usuario.id`.
5. `tareas.model.js` ejecuta el `INSERT` con placeholders `?` usando una conexión del pool.
6. El controlador responde `201` con la tarea creada. Si algo falla, `next(error)` envía el error a `manejarErrores`, que responde `500`.

---

## 🚀 Instalación y uso

### Requisitos

- Node.js 18 o superior
- MySQL 8 (o XAMPP / Laragon / Docker) corriendo en el puerto 3306

### Pasos

1. **Clonar el repositorio** e ingresar a la carpeta:
   ```bash
   git clone <url-del-repositorio>
   cd proyecto-tareas
   ```

2. **Crear la base, las tablas y el usuario** (como root):
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   Opcional con Docker:
   ```bash
   docker run --name mysql-tareas -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8
   ```

3. **Instalar dependencias:**
   ```bash
   npm install
   ```

4. **Configurar variables de entorno:** copiar `.env.example` a `.env` y completarlo.

5. **Iniciar el servidor:**
   ```bash
   npm run dev     # con nodemon
   npm start       # sin nodemon
   ```

### Variables de entorno (`.env`)

```env
PORT=3000
JWT_SECRET=una-clave-larga-dificil-de-adivinar-12345

DB_HOST=localhost
DB_PORT=3306
DB_USER=tareas_app
DB_PASSWORD=una-clave-segura
DB_NAME=tareas_db
```

> ⚠️ El archivo `.env` está en el `.gitignore` y **no debe subirse al repositorio**. Cambiá `JWT_SECRET` y `DB_PASSWORD` por valores propios.

---

## 📡 Endpoints

| Método | URL | Auth | Descripción | Respuestas |
|---|---|---|---|---|
| POST | `/registro` | No | Crea un usuario `{ email, password }` | 201, 400 |
| POST | `/login` | No | Devuelve `{ token }` | 200, 400, 401 |
| GET | `/tareas` | Sí | Lista las tareas del usuario | 200, 401 |
| POST | `/tareas` | Sí | Crea una tarea `{ texto }` | 201, 400, 401 |
| PATCH | `/tareas/:id` | Sí | Alterna completada / pendiente | 200, 401, 404 |
| DELETE | `/tareas/:id` | Sí | Elimina la tarea | 204, 401, 404 |

Las rutas protegidas necesitan el header:

```
Authorization: Bearer <token>
```

### Prueba rápida (consola del navegador)

```js
const url = 'http://localhost:3000';
const json = { 'Content-Type': 'application/json' };

// 1. Registrar
await fetch(url + '/registro', { method: 'POST', headers: json,
  body: JSON.stringify({ email: 'ana@mail.com', password: '1234' }) });

// 2. Iniciar sesión y guardar el token
const { token } = await (await fetch(url + '/login', { method: 'POST', headers: json,
  body: JSON.stringify({ email: 'ana@mail.com', password: '1234' }) })).json();

// 3. Crear una tarea
await fetch(url + '/tareas', { method: 'POST',
  headers: { ...json, Authorization: 'Bearer ' + token },
  body: JSON.stringify({ texto: 'Estudiar MySQL' }) });

// 4. Listar tareas
console.log(await (await fetch(url + '/tareas',
  { headers: { Authorization: 'Bearer ' + token } })).json());
```

---

## 🔐 Autenticación

- **Registro:** la contraseña se hashea con `bcrypt.hash(password, 10)`. Nunca se guarda en texto plano y el hash nunca se devuelve al cliente. Si el email ya existe, la restricción `UNIQUE` de MySQL lanza `ER_DUP_ENTRY` y la API responde 400.
- **Login:** se busca el usuario por email y se compara la contraseña con `bcrypt.compare`. Ante cualquier fallo el mensaje es el mismo ("Email o contraseña incorrectos") para no revelar qué emails están registrados.
- **Token:** `jwt.sign` genera un JWT firmado con `JWT_SECRET` que vence a las 2 horas.
- **Stateless:** el servidor no guarda sesiones; verifica la firma del token en cada pedido.
- **Aislamiento por usuario:** el `id` sale del token verificado, y todas las consultas de tareas (incluidos `UPDATE` y `DELETE`) filtran por `usuario_id`.

---

## 🗄️ Base de datos

Tablas definidas en `database/schema.sql`:

- **`usuarios`**: `id`, `email` (único), `password_hash`, `creado_en`
- **`tareas`**: `id`, `texto`, `completada`, `usuario_id` (clave foránea), `creado_en`

Detalles a tener en cuenta:

- `ON DELETE CASCADE`: al borrar un usuario, MySQL borra sus tareas.
- `utf8mb4`: soporta cualquier carácter, emojis incluidos.
- `BOOLEAN` es un alias de `TINYINT(1)`, por eso el modelo convierte con `!!tarea.completada`.
- La app se conecta con un usuario propio (`tareas_app`) que solo tiene permisos `SELECT, INSERT, UPDATE, DELETE` sobre `tareas_db`, no como `root`.

### De SQLite a MySQL

| | SQLite (clase 16) | MySQL (este TP) |
|---|---|---|
| Qué es | Un archivo | Un servidor aparte (puerto 3306) |
| Librería | `better-sqlite3` (síncrona) | `mysql2/promise` (con `await`) |
| Traer filas | `.all()` / `.get()` | `const [filas] = await pool.query(...)` |
| Id insertado | `.run().lastInsertRowid` | `resultado.insertId` |
| Filas afectadas | `.run().changes` | `resultado.affectedRows` |
| Crear tablas | Desde el código | Con `schema.sql` |

---

## 💡 Decisiones de diseño

- **`app.js` y `server.js` separados:** `app.js` arma la aplicación y `server.js` la pone a escuchar, lo que permite hacer tests sin levantar un servidor real.
- **`dotenv` en la primera línea de `server.js`:** con ES Modules los imports se ejecutan en orden; si dotenv quedara después, `db.js` leería variables en `undefined`.
- **Un solo pool de conexiones**, creado en `db.js` y compartido por todos los modelos.
- **Placeholders `?`** en todas las consultas para evitar inyección SQL.
- **`try/catch` con `next(error)`** en cada controlador: en Express 4, si una función async falla, Express no se entera por sí solo.
- **El modelo no conoce HTTP:** devuelve `true` o `false` y el controlador decide si es un 404.
- **Al cliente nunca se le envía el error original de MySQL**, porque puede revelar nombres de tablas o columnas.

---

## 🛠️ Errores comunes

| Error | Causa probable |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL no está corriendo |
| `ER_ACCESS_DENIED_ERROR` con usuario vacío | El `.env` no se cargó (revisar `dotenv` y que esté en la raíz) |
| `ER_ACCESS_DENIED_ERROR` con usuario correcto | Contraseña incorrecta |
| `ER_BAD_DB_ERROR` | No se ejecutó `schema.sql` o `DB_NAME` está mal escrito |
| `ERR_MODULE_NOT_FOUND` | Falta la extensión `.js` en un import o la ruta relativa es incorrecta |
| 401 con token válido | Falta el prefijo `Bearer ` en el header |
| Respuesta con un array dentro de otro | Faltan los corchetes en `const [filas] = await ...` |

---

## 📚 Material de referencia

- Clase 17 — Autenticación básica
- Clase 19 — Estructura del proyecto y MySQL
