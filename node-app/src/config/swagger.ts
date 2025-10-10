import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Universal Data Stack API',
    version: '1.0.0',
    description: 'A complete API for dynamic JSON document management with MongoDB',
    contact: {
      name: 'Universal Data Stack Team',
      email: 'contact@universaldata.com',
      url: 'https://github.com/pegesen/universal-data-stack'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.universaldata.com',
      description: 'Production server'
    }
  ],
  components: {
    schemas: {
      Document: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Unique document identifier',
            example: '507f1f77bcf86cd799439011'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Document creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Document last update timestamp'
          }
        },
        required: ['_id']
      },
      CollectionResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Document'
            },
            description: 'Array of documents'
          },
          pagination: {
            $ref: '#/components/schemas/PaginationInfo'
          }
        },
        required: ['data', 'pagination']
      },
      PaginationInfo: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Current page number',
            example: 1
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            description: 'Number of items per page',
            example: 100
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of items',
            example: 150
          },
          pages: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of pages',
            example: 2
          }
        },
        required: ['page', 'limit', 'total', 'pages']
      },
      CollectionListResponse: {
        type: 'object',
        properties: {
          collections: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of available collections',
            example: ['users', 'products', 'orders']
          }
        },
        required: ['collections']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error type',
            example: 'Validation error'
          },
          message: {
            type: 'string',
            description: 'Error message',
            example: 'Collection name is required and must be a string'
          },
          field: {
            type: 'string',
            description: 'Field that caused the error',
            example: 'collection'
          },
          details: {
            type: 'string',
            description: 'Additional error details'
          }
        },
        required: ['error', 'message']
      },
      HealthCheckResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['OK', 'ERROR'],
            description: 'Service status',
            example: 'OK'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Check timestamp',
            example: '2023-12-07T10:30:00.000Z'
          },
          mongodb: {
            type: 'string',
            enum: ['connected', 'disconnected'],
            description: 'MongoDB connection status',
            example: 'connected'
          }
        },
        required: ['status', 'timestamp', 'mongodb']
      }
    },
    parameters: {
      CollectionName: {
        name: 'collection',
        in: 'path',
        required: true,
        description: 'Collection name',
        schema: {
          type: 'string',
          pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
          minLength: 1,
          maxLength: 64
        },
        example: 'users'
      },
      DocumentId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Document ID',
        schema: {
          type: 'string',
          pattern: '^[0-9a-fA-F]{24}$'
        },
        example: '507f1f77bcf86cd799439011'
      },
      Page: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        },
        example: 1
      },
      Limit: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 100
        },
        example: 100
      },
      Sort: {
        name: 'sort',
        in: 'query',
        description: 'Field to sort by',
        schema: {
          type: 'string',
          default: '_id'
        },
        example: 'createdAt'
      },
      Order: {
        name: 'order',
        in: 'query',
        description: 'Sort order',
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        },
        example: 'desc'
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      TooManyRequests: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints'
    },
    {
      name: 'Collections',
      description: 'Collection management'
    },
    {
      name: 'Documents',
      description: 'Document CRUD operations'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

export default swaggerJsdoc(options);