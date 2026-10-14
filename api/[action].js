import { handleAI } from '../ai.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = req.query.action;
  if ((action === 'status' && req.method !== 'GET') || (action !== 'status' && req.method !== 'POST')) return res.status(405).json({ error: 'Method not allowed' });
  if (Number(req.headers['content-length'] || 0) > 100000) return res.status(413).json({ error: 'お話が長すぎます。' });
  const result = await handleAI(action, req.body, req.headers.authorization || '');
  res.status(result.status).json(result.body);
}
