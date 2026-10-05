import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiDocument } from '../docs/openapi';

const router = Router();

// A especificação crua, para importar em ferramentas como Postman ou Insomnia
router.get('/docs.json', (_req, res) => {
  res.json(openapiDocument);
});

router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'Help Desk API — Documentação',
    swaggerOptions: {
      // Mantém o token informado em "Authorize" ao recarregar a página
      persistAuthorization: true,
    },
  }),
);

export default router;
