import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

export default router;
