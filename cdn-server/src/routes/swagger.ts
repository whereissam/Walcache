import type { FastifyInstance } from 'fastify'
import fastifySwagger from '@fastify/swagger'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function registerSwagger(fastify: FastifyInstance) {
  // Get the path to swagger.yaml in the cdn-server directory
  const swaggerPath = join(__dirname, '../../swagger.yaml')
  
  // Read and parse the swagger.yaml file
  const swaggerYaml = readFileSync(swaggerPath, 'utf8')
  const swaggerDoc = yaml.load(swaggerYaml) as any

  // Register swagger plugin
  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document: swaggerDoc
    },
    exposeRoute: true
  })

  // Simple Swagger UI using CDN
  fastify.get('/docs', async (request, reply) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>WCDN API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-16x16.png" sizes="16x16" />
    <style>
      html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin:0; background: #fafafa; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        const ui = SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          displayOperationId: true,
          displayRequestDuration: true,
          tryItOutEnabled: true,
          requestInterceptor: function(request) {
            if (!request.headers.Authorization) {
              request.headers.Authorization = 'Bearer your_api_key_here';
            }
            return request;
          }
        });
      };
    </script>
  </body>
</html>
    `
    reply.type('text/html').send(html)
  })

  // Add routes to download the OpenAPI spec
  fastify.get('/openapi.yaml', async (request, reply) => {
    reply.type('text/yaml')
    return swaggerYaml
  })

  fastify.get('/openapi.json', async (request, reply) => {
    reply.type('application/json')
    return swaggerDoc
  })
}