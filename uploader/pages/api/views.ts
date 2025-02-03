// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Client } from '@notionhq/client';
import { v2 as cloudinary } from 'cloudinary';
import { IncomingForm } from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { PassThrough } from 'stream';

type Data = {
  success: boolean;
  message: string;
  data?: unknown;
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
  const databaseId = process.env.NOTION_VIEWSDB_ID;

  if (!databaseId) {
    return Promise.resolve({});
  }

  return notion.pages.create({
    parent: {
      database_id: databaseId,
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
};

const inputMusic = async function inputMusic(data: InputMusicData) {
  const databaseId = process.env.NOTION_MUSICSDB_ID;

  if (!databaseId) {
    return Promise.resolve({});
  }

  return notion.pages.create({
    parent: {
      database_id: databaseId,
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
};

const queryDb = function queryDb(dbId: string, startCursor: string | undefined) {
  return notion.databases.query({
    database_id: dbId,
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'ascending',
      },
    ],
    start_cursor: startCursor,
    page_size: 10,
  });
};

const viewsQuery = async function viewsQuery(startCursor: string | undefined = undefined) {
  const databaseId = process.env.NOTION_VIEWSDB_ID;

  if (!databaseId) {
    return null;
  }

  const { has_more, next_cursor, results: data } = await queryDb(databaseId, startCursor);

  const result = data.map(({ properties }: Record<string, any>) => ({
    name: properties.name.title[0].text.content,
    image: properties.image.rich_text[0].text.content,
    low_image: properties.low_image.rich_text[0].text.content,
    width: properties.width.number,
    height: properties.height.number,
    source: properties.source.rich_text[0].text.content,
    source_link: properties.source_link.rich_text[0].text.content,
    lat: properties.lat.number,
    lng: properties.lng.number,
  }));

  return { result, has_more, next_cursor };
};

const musicsQuery = async function viewsQuery(startCursor: string | undefined = undefined) {
  const databaseId = process.env.NOTION_MUSICSDB_ID;

  if (!databaseId) {
    return null;
  }
  const { has_more, next_cursor, results: data } = await queryDb(databaseId, startCursor);

  const result = data.map(({ properties }: Record<string, any>) => ({
    title: properties.title.title[0].text.content,
    author: properties.author.rich_text[0].text.content,
    url: properties.url.rich_text[0].text.content,
    copyright: properties.copyright.rich_text[0].text.content,
  }));

  return { result, has_more, next_cursor };
};

const upload = function upload(req: NextApiRequest, type: 'music' | 'view') {
  return new Promise<boolean>((resolve, reject) => {
    const pass = new PassThrough();
    const buffers: Uint8Array[] = [];
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
            { resource_type: 'video', folder: process.env.CLOUDINARY_MUSIC_FOLDER },
            (error, result) => {
              if (error) {
                console.log('a');
                reject(false);
                return;
              }

              if (result)
                inputMusic({ ...restMusic, url: result.secure_url })
                  .then(() => {
                    resolve(true);
                  })
                  .catch(() => {
                    console.log('b');
                    reject(false);
                  });
              else {
                console.log('c');
                reject(false);
              }
            },
          );

          pass.pipe(stream);
          break;
        default:
          const { file, ...rest } = fields;
          const restData = rest as ReqView;
          const inputData = { ...restData, lat: Number(restData.lat), lng: Number(restData.lng) };
          const cloudinaryOption = {
            folder: process.env.CLOUDINARY_IMAGE_FOLDER,
            eager: [{ quality: 1, format: 'jpg', width: '0.5', effect: 'pixelate:20' }],
          };
          const buffArrayLengh = buffers.length;

          if (err || bufferLength >= maxFileSize) {
            console.log('d');
            reject(false);
            return;
          }

          if (file && buffArrayLengh === 0 && typeof file === 'string') {
            cloudinary.uploader.upload(file, cloudinaryOption, (error, result) => {
              if (error) {
                console.log(error);
                console.log('e');
                reject(false);
                return;
              }

              if (result)
                inputView({
                  ...inputData,
                  image: result.secure_url,
                  low_image: result.eager[0].secure_url,
                  height: result.height,
                  width: result.width,
                })
                  .then(() => {
                    resolve(true);
                  })
                  .catch(() => {
                    console.log('f');
                    reject(false);
                  });
              else {
                console.log('g');
                reject(false);
              }
            });
          } else if (!file && buffArrayLengh > 0) {
            const stream = cloudinary.uploader.upload_stream(cloudinaryOption, (error, result) => {
              if (error) {
                console.log('h');
                reject(false);
                return;
              }

              if (result)
                inputView({
                  ...inputData,
                  image: result.secure_url,
                  low_image: result.eager[0].secure_url,
                  height: result.height,
                  width: result.width,
                })
                  .then(() => {
                    resolve(true);
                  })
                  .catch(() => {
                    console.log('i');
                    reject(false);
                  });
              else {
                console.log('j');
                reject(false);
              }
            });

            pass.pipe(stream);
          } else {
            console.log('k');
            reject(false);
          }
      }
    });
  });
};

const handler = async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const { q, s, t } = req.query;
    if (req.method === 'POST' && q) {
      await upload(req, q === 'music' ? 'music' : 'view');
      res.status(200).json({ success: true, message: 'success' });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const viewData = await (t?.toString().toLowerCase() === 'music'
      ? musicsQuery(s?.toString())
      : viewsQuery(s?.toString()));

    res.status(200).json({ success: true, message: 'success', data: viewData });
  } catch (e) {
    res.status(400).json({ success: false, message: 'fail' });
  }
};

export default handler;
