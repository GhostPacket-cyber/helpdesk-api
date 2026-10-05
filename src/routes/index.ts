import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import authRoutes from './auth.routes';
import docsRoutes from './docs.routes';
import ticketRoutes from './ticket.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/health', healthCheck);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tickets', ticketRoutes);
router.use('/api', docsRoutes);

export default router;
