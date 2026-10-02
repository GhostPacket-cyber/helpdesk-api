import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', healthCheck);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
