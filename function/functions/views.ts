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

  if (databaseId) {
    const { has_more, next_cursor, results: data } = await queryDb(databaseId, startCursor);

    const result = data.map(({ properties }: Record<string, any>) => ({
      name: properties.name.title[0].text.content,
      image: properties.image.rich_text[0].text.content,
      low_image: properties.low_image.rich_text[0].text.content,
      width: properties.width.number,
      heigh: properties.height.number,
      source: properties.source.rich_text[0].text.content,
      source_link: properties.source_link.rich_text[0].text.content,
      lat: properties.lat.number,
      lng: properties.lng.number,
    }));

    return { result, has_more, next_cursor };
  } else return null;
};

const musicsQuery = async function viewsQuery(startCursor: string | undefined = undefined) {
  const databaseId = process.env.NOTION_MUSICSDB_ID;

  if (databaseId) {
    const { has_more, next_cursor, results: data } = await queryDb(databaseId, startCursor);

    const result = data.map(({ properties }: Record<string, any>) => ({
      title: properties.title.title[0].text.content,
      author: properties.author.rich_text[0].text.content,
      url: properties.url.rich_text[0].text.content,
      copyright: properties.copyright.rich_text[0].text.content,
    }));

    return { result, has_more, next_cursor };
  } else return null;
};

const response = function response(
  statuscode: number = 400,
  message: string = 'fail',
  data: unknown = null,
) {
  return {
    statusCode: statuscode,
    body: JSON.stringify({ message, data }),
  };
};

const handler: Handler = async (event) => {
  const { body, queryStringParameters } = event;
  if (body) {
    const { headers, isBase64Encoded } = event;
    const message = await busboyHandler({ body, headers, isBase64Encoded });
    return response(200, message, null);
  }

  if (queryStringParameters) {
    const { s, t } = queryStringParameters;

    if (!t) return response();

    try {
      const viewData = await (t.toLowerCase() === 'view' ? viewsQuery(s) : musicsQuery(s));

      if (viewData) return response(200, 'success', viewData);
      else return response();
    } catch (e) {
      console.log(e);
      return response();
    }
  }

  return response();
};

export { handler };
