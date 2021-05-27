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

type Req = {
  [field: string]: string;
};

type ReqViewData = {
  name: string;
  source: string;
  source_link: string;
  lat: string;
  lng: string;
};

type ReqMusicData = {
  title: string;
  author: string;
  copyright: string;
};

type ReqView = ReqViewData & Req;

type ReqMusic = ReqMusicData & Req;

type InputViewData = Omit<ReqViewData, 'lat' | 'lng'> & {
  lat: number;
  lng: number;
  image: string;
  low_image: string;
  width: number;
  height: number;
};

type InputMusicData = ReqMusicData & { url: string };

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

const inputView = async function inputView(data: InputViewData) {
  const result = await notion.pages.create({
    parent: {
      database_id: process.env.NOTION_VIEWSDB_ID as string,
    },
    properties: {
      name: {
        id: 'title',
        type: 'title',
        title: [
          {
            type: 'text',
            text: {
              content: data.name,
            },
          },
        ],
      },
      image: {
        id: 'ltI|',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.image,
            },
          },
        ],
      },
      low_image: {
        id: 'eITU',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.low_image,
            },
          },
        ],
      },
      width: {
        id: '\\yDn',
        type: 'number',
        number: data.width,
      },
      height: {
        id: '_@^U',
        type: 'number',
        number: data.height,
      },
      source: {
        id: 'Am~T',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.source,
            },
          },
        ],
      },
      source_link: {
        id: 'EMdM',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.source_link,
            },
          },
        ],
      },
      lat: {
        id: 'Ay>}',
        type: 'number',
        number: data.lat,
      },
      lng: {
        id: 'tk;A',
        type: 'number',
        number: data.lng,
      },
    },
  });

  return result;
};

const inputMusic = async function inputMusic(data: InputMusicData) {
  const result = await notion.pages.create({
    parent: {
      database_id: process.env.NOTION_MUSICSDB_ID as string,
    },
    properties: {
      title: {
        id: 'title',
        type: 'title',
        title: [
          {
            type: 'text',
            text: {
              content: data.title,
            },
          },
        ],
      },
      author: {
        id: '~^[f',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.author,
            },
          },
        ],
      },
      url: {
        id: 'lso]',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.url,
            },
          },
        ],
      },
      copyright: {
        id: ';OP`',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: data.copyright,
            },
          },
        ],
      },
    },
  });

  return result;
};

const upload = function upload(req: NextApiRequest, type: 'music' | 'view') {
  return new Promise<boolean>((resolve, reject) => {
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
      part
        .on('data', (buffer) => {
          buffers.push(buffer);
          pass.write(buffer);
        })
        .on('end', () => {
          bufferLength = Buffer.concat(buffers).toString().length;
          pass.end();
        });
    };
    form.parse(req, (err, fields) => {
      switch (type) {
        case 'music':
          const { file: music, ...restMusicData } = fields;
          const restMusic = restMusicData as ReqMusic;
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'video' },
            (error, result) => {
              if (error) {
                reject(false);
                return;
              }

              if (result)
                inputMusic({ ...restMusic, url: result.url })
                  .then(() => resolve(true))
                  .catch(() => reject(false));
              else resolve(true);
            },
          );

          pass.pipe(stream);
          break;
        default:
          const { file, ...rest } = fields;
          const restData = rest as ReqView;
          const { lat, lng } = restData;
          const inputData = { ...restData, lat: Number(lat), lng: Number(lng) };
          const cloudinaryOption = {
            eager: [{ quality: 1, format: 'jpg', width: '0.5', effect: 'pixelate:20' }],
          };
          const buffArrayLengh = buffers.length;

          if (err || bufferLength >= maxFileSize) {
            reject(false);
            return;
          }

          if (file && buffArrayLengh === 0) {
            cloudinary.uploader.upload(file as string, cloudinaryOption, (error, result) => {
              if (error) {
                reject(false);
                return;
              }

              if (result)
                inputView({
                  ...inputData,
                  image: result.url,
                  low_image: result.eager[0].url,
                  height: result.height,
                  width: result.width,
                })
                  .then(() => resolve(true))
                  .catch(() => reject(false));
              else resolve(true);
            });
          } else if (!file && buffArrayLengh > 0) {
            const stream = cloudinary.uploader.upload_stream(cloudinaryOption, (error, result) => {
              if (error) {
                reject(false);
                return;
              }

              if (result)
                inputView({
                  ...inputData,
                  image: result.url,
                  low_image: result.eager[0].url,
                  height: result.height,
                  width: result.width,
                })
                  .then(() => resolve(true))
                  .catch(() => reject(false));
              else resolve(true);
            });

            pass.pipe(stream);
          } else {
            reject(false);
          }
      }
    });
  });
};

const handler = async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { q } = req.query;
  if (req.method?.toLowerCase() === 'post' && q) {
    const isUploded = await (q === 'music' ? upload(req, 'music') : upload(req, 'view'));
    if (isUploded) res.status(200).json({ message: 'sucess' });
    else res.status(400).json({ message: 'fail' });
  } else {
    res.status(200).json({ message: 'hi' });
  }
};

export default handler;
