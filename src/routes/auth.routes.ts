import { Router } from 'express';
import { register } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate';
import { registerSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validateBody(registerSchema), register);

export default router;
