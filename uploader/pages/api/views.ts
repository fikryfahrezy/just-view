// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { Buffer } from 'buffer';
import { PassThrough } from 'stream';
import { IncomingForm } from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import { Client } from '@notionhq/client';

type Data = {
  message: string;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = function upload(req: NextApiRequest) {
  return new Promise((resolve, reject) => {
    const pass = new PassThrough();
    const buffers: Buffer[] = [];
    const maxFileSize = 1 * 1024 * 1024;
    const form = new IncomingForm({ maxFileSize });
    let bufferLength = 0;

    /**
     * REF: Accessing the raw file stream from a node-formidable file upload
     * https://stackoverflow.com/a/57084433/12976234
     */
    form.onPart = (part) => {
      if (part.filename === '' || !part.mime) {
        form.handlePart(part);
        return;
      }
      part.on('data', (buffer) => {
        buffers.push(buffer);
        pass.write(buffer);
      });
      part.on('end', () => {
        bufferLength = Buffer.concat(buffers).toString().length;
        pass.end();
      });
    };
    form.parse(req, (err, fields) => {
      if (err || bufferLength >= maxFileSize) {
        reject(false);
        return;
      }

      const stream = cloudinary.uploader.upload_stream(
        { quality: 1, format: 'jpg', width: '0.5', effect: 'pixelate:20' },
        (error, result) => {
          if (error) {
            reject(false);
            return;
          }

          console.log(result);
          resolve(true);
        },
      );
      pass.pipe(stream);
    });
  });
};

const handler = async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const isUploded = false; // await upload(req);
  if (isUploded) res.status(200).json({ message: 'sucess' });
  else res.status(400).json({ message: 'fail' });
};

export default handler;
