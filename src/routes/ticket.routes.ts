import { Router } from 'express';
import { createComment, listComments } from '../controllers/comment.controller';
import { listHistory } from '../controllers/history.controller';
import {
  assignTicket,
  createTicket,
  getTicket,
  listTickets,
  updateTicket,
  updateTicketStatus,
} from '../controllers/ticket.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validateBody, validateParams } from '../middlewares/validate';
import { createCommentSchema } from '../validators/comment.validator';
import {
  assignTicketSchema,
  createTicketSchema,
  ticketIdParamSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
} from '../validators/ticket.validator';

const router = Router();

// Todas as rotas de chamados exigem login
router.use(authenticate);

router.post('/', authorize('USER', 'ADMIN'), validateBody(createTicketSchema), createTicket);
router.get('/', listTickets);
router.get('/:id', validateParams(ticketIdParamSchema), getTicket);
router.patch('/:id', validateParams(ticketIdParamSchema), validateBody(updateTicketSchema), updateTicket);
router.post(
  '/:id/assign',
  authorize('TECH', 'ADMIN'),
  validateParams(ticketIdParamSchema),
  validateBody(assignTicketSchema),
  assignTicket,
);
router.patch(
  '/:id/status',
  authorize('TECH', 'ADMIN'),
  validateParams(ticketIdParamSchema),
  validateBody(updateTicketStatusSchema),
  updateTicketStatus,
);

// Comentários são um sub-recurso do chamado: só existem dentro de um
router.post('/:id/comments', validateParams(ticketIdParamSchema), validateBody(createCommentSchema), createComment);
router.get('/:id/comments', validateParams(ticketIdParamSchema), listComments);

// O histórico é somente leitura: os registros são criados pelo sistema a cada ação
router.get('/:id/history', validateParams(ticketIdParamSchema), listHistory);

export default router;
