import { handleAI } from './ai.js';

// Every production function handles a fixed route. No development server is started.
export async function handleRequest(action, req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const method = action === 'status' ? 'GET' : 'POST';
  if (req.method !== method) {
    res.setHeader('Allow', method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (Number(req.headers?.['content-length'] || 0) > 100000) return res.status(413).json({ error: 'お話が長すぎます。' });
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: '入力の形式が正しくありません。' }); }
  }
  try {
    const result = await handleAI(action, body, req.headers?.authorization || '');
    return res.status(result.status).json(result.body);
  } catch {
    return res.status(500).json({ error: '処理を完了できませんでした。入力したお話はブラウザに保存されています。' });
  }
}
