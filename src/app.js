import express from 'express';
import authRoutes from './routes/auth.routes.js';
import tareasRoutes from './routes/tareas.routes.js';
import { manejarErrores } from './middlewares/manejarErrores.js';

const app = express();

app.use(express.json());
app.use(authRoutes);               // /registro y /login
app.use('/tareas', tareasRoutes);  // todo lo que empiece con /tareas
app.use(manejarErrores);           // siempre al final

export default app;
