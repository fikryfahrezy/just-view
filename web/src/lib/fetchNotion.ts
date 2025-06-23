import type {
    FetchClient,
    ViewComponentData,
    ViewMainData,
    ViewDetailData,
    NotionResponseData,
    ViewData,
    MusicData,
} from '../type';

export const fetchViews: FetchClient<ViewComponentData[]> = async (serverUrl, start = undefined) => {
  const url = `${serverUrl}/api/notion?t=view${start ? `&s=${start}` : ''}`;

  try {
    const res = await fetch(url);
    const { data } = await (res.json() as Promise<NotionResponseData<ViewData[]>>);
    const { result, has_more, next_cursor } = data;

    const items: ViewComponentData[] = result.map(
      ({ name, image, low_image, source, source_link, height, width, lat, lng }) => {
        const main: ViewMainData = {
          name,
          width,
          height,
          image,
          low_image,
        };
        const detail: ViewDetailData = {
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

export const fetchMusics: FetchClient<MusicData[]> = async (serverUrl, start = undefined) => {
  const url = `${serverUrl}/api/notion?t=music${start ? `&s=${start}` : ''}`;

  try {
    const res = await fetch(url);
    const { data } = await (res.json() as Promise<NotionResponseData<MusicData[]>>);
    const { result, has_more, next_cursor } = data;

    return { data: result, more: has_more, next: next_cursor };
  } catch (err) {
    console.log(err);
    return { data: [], more: false, next: null };
  }
};
