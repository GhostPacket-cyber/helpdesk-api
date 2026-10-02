import { Router } from 'express';
import { createUser, getUser, listUsers, updateUser, updateUserStatus } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validateBody, validateParams } from '../middlewares/validate';
import { uuidParamSchema } from '../validators/common.validator';
import { createUserSchema, updateUserSchema, updateUserStatusSchema } from '../validators/user.validator';

const router = Router();

// Vale para todas as rotas abaixo: precisa estar logado e ser ADMIN
router.use(authenticate, authorize('ADMIN'));

router.get('/', listUsers);
router.post('/', validateBody(createUserSchema), createUser);
router.get('/:id', validateParams(uuidParamSchema), getUser);
router.patch('/:id', validateParams(uuidParamSchema), validateBody(updateUserSchema), updateUser);
router.patch('/:id/status', validateParams(uuidParamSchema), validateBody(updateUserStatusSchema), updateUserStatus);

export default router;
