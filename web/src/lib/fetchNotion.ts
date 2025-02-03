import type {
  FetchClient,
  ItemComponentData,
  ItemMainData,
  ModalComponentData,
  NotionResponseData,
} from '../type';

const fetchNotion: FetchClient = async function fetViews(serverUrl, start = undefined) {
  const url = `${serverUrl}/api/views?t=view${start ? `&s=${start}` : ''}`;

  try {
    const res = await fetch(url);
    const { data } = await (res.json() as Promise<NotionResponseData>);
    const { result, has_more, next_cursor } = data;

    const items: ItemComponentData[] = result.map(
      ({ name, image, low_image, source, source_link, height, width, lat, lng }) => {
        const main: ItemMainData = {
          name,
          width,
          height,
          image,
          low_image,
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

    return { data: items, more: has_more, next: next_cursor };
  } catch (err) {
    console.log(err);
    return { data: [], more: false, next: null };
  }
};

export default fetchNotion;
