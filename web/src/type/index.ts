export type ViewData = {
  name: string;
  image: string;
  low_image: string;
  width: number;
  height: number;
  source: string;
  source_link: string;
  lat: number;
  lng: number;
};

export type MusicData = {
  title: string;
  author: string;
  url: string;
  copyright: string;
}

export type ViewMainData = Pick<ViewData, 'name' | 'image' | 'low_image' | 'height' | 'width'>;

export type ViewDetailData = Pick<ViewData, 'name' | 'source' | 'source_link' | 'lat' | 'lng'>;

export type ViewComponentData = {
  main: ViewMainData;
  detail: ViewDetailData;
};

export type NotionResponseData<TData> = {
  message: string;
  data: {
    result: TData;
    has_more: boolean;
    next_cursor: string;
  };
};

export type FetchClient<TData> = (
  serverUrl: string,
  start?: string,
) => Promise<{ data: TData; more: boolean; next: string | null }>;

export type FetchState = {
  isFetching: boolean;
  hasMore: boolean;
  nextCursor: string |null
}