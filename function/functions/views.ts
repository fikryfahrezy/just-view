import { PassThrough } from 'stream';
import { Handler, HandlerEvent } from '@netlify/functions';
import Busboy from 'busboy';
import { Client } from '@notionhq/client';

type ResultType = {
  file:
    | null
    | string
    | { fieldname: string; filename: string; encoding: string; mimetype: string; data: Buffer };
} & Record<string, unknown>;

type BusboyHandlerParams = {
  headers: HandlerEvent['headers'];
  isBase64Encoded: HandlerEvent['isBase64Encoded'];
  body: string;
};

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

/**
 * REF: Missing data when using busboy inside Lambda? #199
 * https://github.com/mscdex/busboy/issues/199
 */
const busboyHandler: (events: BusboyHandlerParams) => Promise<string> = function busboyHandler({
  headers,
  isBase64Encoded,
  body,
}) {
  return new Promise((resolve, reject) => {
    const result: ResultType = {
      file: null,
    };
    const pass = new PassThrough();
    const busboy = new Busboy({
      headers: {
        ...headers,
        'content-type': headers['Content-Type'] || headers['content-type'],
      },
    });

    busboy
      .on('file', (_, file) => {
        file
          .on('data', (data) => {
            pass.write(data);
          })
          .on('end', () => {
            pass.end();
          });
      })
      .on('field', (fieldname, value) => {
        try {
          result[fieldname] = JSON.parse(value);
        } catch (err) {
          result[fieldname] = value;
        }
      })
      .on('error', (error: unknown) => reject(`Parse error: ${error}`))
      .on('finish', () => {
        resolve('Success');
      });
    busboy.write(body, isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
};

const handler: Handler = async (event) => {
  if (event.body) {
    const { body, headers, isBase64Encoded } = event;
    const message = await busboyHandler({ body, headers, isBase64Encoded });
    return {
      statusCode: 200,
      body: JSON.stringify({ message }),
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Fail' }),
    };
  }
};

export { handler };
