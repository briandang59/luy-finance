import google from '../../google.mjs';

export default function handler(req,res) {
  const query = new URL(req.url,'http://localhost').search;
  req.url = `/api/auth/google/callback${query}`;
  return google(req,res);
}
