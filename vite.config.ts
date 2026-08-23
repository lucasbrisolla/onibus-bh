import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { resolveLocalApiRequest } from './src/server/localApiRouter';
import { defaultApiOperations } from './src/server/apiOperations';

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'onibus-bh-local-api',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const result = await resolveLocalApiRequest({
            method: request.method,
            url: request.url,
            handlers: defaultApiOperations,
          });

          if (!result) {
            next();
            return;
          }

          response.statusCode = result.status;
          response.setHeader('content-type', 'application/json; charset=utf-8');
          response.end(JSON.stringify(result.body));
        });
      },
    },
  ],
});
