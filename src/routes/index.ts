import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', healthCheck);
router.use('/auth', authRoutes);

export default router;
