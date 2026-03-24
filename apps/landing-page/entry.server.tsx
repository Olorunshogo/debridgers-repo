import { renderToPipeableStream } from 'react-dom/server';
import { createRequestHandler } from '@react-router/node';
import { PassThrough } from 'stream';

const handler = createRequestHandler({
  build: await import('./build/server/index.js')
});

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers
) {
  return new Promise((resolve) => {
    const { pipe } = renderToPipeableStream(
      handler(request),
      {
        onShellReady() {
          const body = new PassThrough();
          pipe(body);

          resolve(
            new Response(body as any, {
              status: responseStatusCode,
              headers: responseHeaders
            })
          );
        }
      }
    );
  });
}