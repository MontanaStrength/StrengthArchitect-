import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const localApiPlugin = () => {
  return {
    name: 'local-generate-workout-api',
    apply: 'serve',
    configureServer(server: any) {
      server.middlewares.use('/api/generate-workout', async (req: any, res: any, next: any) => {
        try {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          let raw = '';
          req.on('data', (chunk: any) => {
            raw += chunk;
          });
          req.on('end', async () => {
            const body = raw ? JSON.parse(raw) : {};
            const { generateWorkoutServer } = await import('./server/generateWorkout');
            const plan = await generateWorkoutServer(body?.data, Array.isArray(body?.history) ? body.history : []);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(plan));
          });
        } catch (err: any) {
          console.error('Local /api/generate-workout error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
        }
      });
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), localApiPlugin()],
      define: {
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
