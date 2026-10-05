import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { loginRateLimiter, registerRateLimiter } from '../middlewares/rateLimiter';
import { validateBody } from '../middlewares/validate';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', registerRateLimiter, validateBody(registerSchema), register);
router.post('/login', loginRateLimiter, validateBody(loginSchema), login);
router.get('/me', authenticate, me);

export default router;
