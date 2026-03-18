import { Router } from 'express';
import type { Router as RouterType } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router: RouterType = Router();

// Swagger/OpenAPI specification
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Competitor Monitor API',
      version: '1.0.0',
      description: 'Public REST API for accessing competitor monitoring data',
      contact: {
        name: 'API Support',
        email: 'support@competitormonitor.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key authentication',
        },
      },
      schemas: {
        Competitor: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Competitor ID',
              example: 'comp-123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              description: 'Competitor name',
              example: 'Example Corp',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Competitor website URL',
              example: 'https://example.com',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Report ID',
            },
            competitorId: {
              type: 'string',
              description: 'Associated competitor ID',
            },
            jsonData: {
              type: 'object',
              description: 'Report data in JSON format',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/public-api.ts'], // Point to JSDoc comments in route files
});

/**
 * GET /api/docs
 * Swagger UI documentation
 */
router.get('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Competitor Monitor API Docs',
}));

/**
 * GET /api/docs.json
 * OpenAPI JSON specification
 */
router.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

export default router;
