import google from '../google.mjs';

// File-based entry point when Vercel deploys native Node.js Functions.
// The Docker server routes this URL to the same shared handler.
export default function handler(req,res) {
  const query = new URL(req.url,'http://localhost').search;
  req.url = `/api/auth/google${query}`;
  return google(req,res);
}
