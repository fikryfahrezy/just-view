import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  id: string;
  password: string;
};

export default (req: NextApiRequest, res: NextApiResponse) => {
  const method = req.method;
  const body = req.body as Data;
  const id = process.env.USER_ID;
  const pw = process.env.USER_PW;
  const cookieVal = process.env.COOKIE_VAL;

  if (!method || method.toUpperCase() !== 'POST') {
    res.status(404).send('fail');
    return;
  }

  if (body.id !== id || body.password !== pw) {
    res.status(403).send('fail');
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';

  res
    .setHeader(
      'Set-Cookie',
      `gigler=${cookieVal
        ?.split('')
        .reverse()
        .join('')}; Path=/; Max-Age=86400; Secure=${isProd} HttpOnly=${isProd} `,
    )
    .status(200)
    .send('success');
};
