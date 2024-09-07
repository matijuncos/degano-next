import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const path = req.body.path || '/';
      // Revalidate the indicated page
      await res.revalidate(path);
      return res.json({ revalidated: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to revalidate' });
    }
  }
  return res.status(405).json({ message: 'Method not allowed' });
}
