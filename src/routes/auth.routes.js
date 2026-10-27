import { Router } from 'express';
import * as controlador from '../controllers/auth.controller.js';

const router = Router();

router.post('/registro', controlador.registro);
router.post('/login', controlador.login);

export default router;
