import { handle } from '@hono/node-server/vercel';
import { app } from '../server/app';

export const config = {
  runtime: 'nodejs'
};

const dispatch = (req: Request) => {
  const matchedPath = req.headers.get('x-matched-path');
  if (matchedPath) {
    const url = new URL(req.url);
    url.pathname = matchedPath;
    const newReq = new Request(url.toString(), req);
    return app.fetch(newReq);
  }
  return app.fetch(req);
};

export const GET = (req: Request) => dispatch(req);
export const POST = (req: Request) => dispatch(req);
export const PATCH = (req: Request) => dispatch(req);
export const PUT = (req: Request) => dispatch(req);
export const DELETE = (req: Request) => dispatch(req);

export default (req: any, res: any) => {
  const matchedPath = req.headers?.['x-matched-path'];
  if (matchedPath && typeof matchedPath === 'string') {
    req.url = matchedPath;
  }
  return handle(app)(req, res);
};
