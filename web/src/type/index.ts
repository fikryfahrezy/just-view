type ViewData = {
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

export type ItemMainData = Pick<ViewData, 'name' | 'image' | 'low_image' | 'height' | 'width'>;

export type ModalComponentData = Pick<ViewData, 'name' | 'source' | 'source_link' | 'lat' | 'lng'>;

export type ItemComponentData = {
  main: ItemMainData;
  detail: ModalComponentData;
};

export type NotionResponseData = {
  message: string;
  data: {
    result: ViewData[];
    has_more: boolean;
    next_cursor: string;
  };
};

export type FetchViewsCount = (serverUrl: string) => Promise<number>;

export type FetchViewMongo = (
  serverUrl: string,
  start: number,
) => Promise<{ data: ItemComponentData[]; viewSize: number }>;

export type FetchViewNotion = (
  serverUrl: string,
  start?: string,
) => Promise<{ data: ItemComponentData[]; more: boolean; next: string | null }>;
