import type {
  ItemComponentData,
  ItemMainData,
  ModalComponentData,
  FetchViewMongo,
  FetchViewsCount,
} from '../type';

export const fetchViewsMongo: FetchViewMongo = async function fetViews(serverUrl, start = 0) {
  try {
    const res = await fetch(`${serverUrl}/views?_limit=10&_start=${start}`);
    const body = await res.json();

    const data: ItemComponentData[] = body.map(
      ({ name, source, source_link, lat, lng, image }: any) => {
        const { width, height, url, formats } = image;
        const main: ItemMainData = {
          name,
          width,
          height,
          image: url,
          low_image: formats.thumbnail.url,
        };
        const detail: ModalComponentData = {
          name,
          source,
          source_link,
          lat,
          lng,
        };

        return {
          main,
          detail,
        };
      },
    );

    return { data, viewSize: body.length };
  } catch (err) {
    console.log(err);
    return { data: [], viewSize: 0 };
  }
};

export const fetchViewsCount: FetchViewsCount = async function fetViews(serverUrl) {
  try {
    const res = await fetch(`${serverUrl}/views/count`);
    const count = await res.json();
    return count;
  } catch (err) {
    console.log(err);
    return 0;
  }
};
