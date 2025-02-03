import type { NextApiRequest, NextApiResponse } from 'next';

export default (req: NextApiRequest, res: NextApiResponse) => {
  const method = req.method;

  if (!method || method.toUpperCase() !== 'POST') {
    res.status(404).send('fail');
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';

  res
    .setHeader('Set-Cookie', `auth=''; Path=/; Max-Age=0; Secure=${isProd} HttpOnly=${isProd} `)
    .status(200)
    .send('success');
};
