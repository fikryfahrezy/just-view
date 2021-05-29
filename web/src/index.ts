import type {
  ItemComponentData,
  ModalComponentData,
  FetchViewMongo,
  FetchViewNotion,
} from './type';
import 'lazysizes';
import 'lazysizes/plugins/blur-up/ls.blur-up';
import 'lazysizes/plugins/object-fit/ls.object-fit';
import 'lazysizes/plugins/parent-fit/ls.parent-fit';
import './styles.css';

const cacheVersion = 1;
const cachePrefix = 'just-view';
const cacheName = `${cachePrefix}-${cacheVersion}-${process.env.CACHE_TIME}`;
const isMongo = JSON.parse(process.env.IS_MONGO);
const serverUrl = isMongo ? process.env.SERVER_MONGO : process.env.SERVER_NOTION;
const wThumbnail = process.env.W_THUMBNAIL;
const mThumbnail = process.env.M_THUMBNAIL;
const musics = process.env.MUSICS.split(' ');

// https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device
const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent);
const grid = document.getElementById('grid');
const scrollButton = document.getElementById('scroll-button');
const loadMore = document.getElementById('load-more');
const thumbnail = document.getElementById('thumbnail');
const main = document.getElementById('main');
const audioContainer = document.getElementById('audio-container');
const audio = document.getElementById('audio') as HTMLAudioElement;
const circle = document.getElementById('progress') as unknown as SVGCircleElement;
const percentController = document.getElementById('percent-contoller');
const isCacheAvailable = 'caches' in window;
let observer = null;
let iso: Isotope | null = null;
let imagesLoader: ImagesLoaded.ImagesLoadedConstructor | null = null;
let musicList: Blob[] = [];
let fetchViewsMongo: FetchViewMongo | null = null;
let fetchViewsNotion: FetchViewNotion | null = null;
let viewsCount = 0;
let loadedViews = 0;
let musicStartIndex = 0;
let isFetching = false;
let hasMore = true;
let nextCursor: string | null = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log(`SW registered: ${registration}`);
      })
      .catch((registrationError) => {
        console.log(`SW registeration failed: ${registrationError}`);
      });
  });
}

// Delete any old caches to respect user's disk space.
async function deleteOldCaches(currentCache: string) {
  const keys = await caches.keys();
  keys.forEach((key) => {
    const isOurCache = key.includes(currentCache);
    if (!isOurCache) {
      caches.delete(key);
    }
  });
}

// Get data from the cache.
async function getCachedData(cacheName: string) {
  const cacheStorage = await caches.open(cacheName);
  const cacheKeys = await cacheStorage.keys();
  const matchedCaches = await Promise.all(cacheKeys.map((key) => cacheStorage.match(key)));
  const isOk = matchedCaches.reduce((_, curr) => (curr && curr.ok ? true : false), false);

  return isOk && matchedCaches;
}

/**
 * Cache related refrences
 * https://googlechrome.github.io/samples/service-worker/window-caches/
 * https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
 * https://developer.mozilla.org/en-US/docs/Web/API/Cache
 * https://web.dev/cache-api-quick-guide/
 * https://gist.github.com/hscstudio/3f2046acfa31a4211c175c790468c7ee
 */
// Try to get data from the cache, but fall back to fetching it live.
async function getData(urls: string[]) {
  let cachedData = await getCachedData(cacheName);

  if (cachedData) {
    return cachedData;
  }

  const cacheStorage = await caches.open(cacheName);
  await cacheStorage.addAll(urls);
  cachedData = await getCachedData(cacheName);
  await deleteOldCaches(cacheName);

  return cachedData;
}

/**
 * Building a Progress Ring, Quickly
 * https://css-tricks.com/building-progress-ring-quickly/
 */
const setProgress = function setProgress(percent: number) {
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;

  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = `${circumference}`;

  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = String(offset);
};

const modalAnchorComponent = function modalAnchorComponent(link: string) {
  const anchor = document.createElement('a');
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.href = link;

  return anchor;
};

const modalComponent = function modalComponent({
  name,
  source,
  source_link,
  lat,
  lng,
}: ModalComponentData) {
  const descDiv = document.createElement('div');
  descDiv.classList.add('modal');

  const placeName = document.createElement('p');
  descDiv.appendChild(placeName);
  placeName.textContent = name;

  const sourceLink = modalAnchorComponent(source_link);
  descDiv.appendChild(sourceLink);

  const sourceName = document.createElement('p');
  sourceLink.appendChild(sourceName);
  sourceName.textContent = source;

  const mapLink = modalAnchorComponent(`https://maps.google.com/?q=${lat},${lng}`);
  descDiv.appendChild(mapLink);

  const button = document.createElement('button');
  mapLink.appendChild(button);

  const pinIcon = document.createElement('i');
  button.appendChild(pinIcon);
  pinIcon.classList.add('fas', 'fa-map-marker-alt');
  button.append('Map');

  return descDiv;
};

const itemComponent = function itemComponent({ main, detail }: ItemComponentData) {
  const { name, image, low_image, height, width } = main;

  const item = document.createElement('div');
  item.classList.add('grid-item');

  const mediaBox = document.createElement('div');
  item.appendChild(mediaBox);
  mediaBox.classList.add('mediabox');

  const img = document.createElement('img');
  mediaBox.appendChild(img);
  img.classList.add('media-box', 'lazyload', 'img');
  img.dataset.sizes = 'auto';
  img.dataset.lowsrc = low_image;
  img.dataset.src = image;
  img.width = width;
  img.height = height;
  img.alt = name;

  item.addEventListener('click', ({ target }) => {
    const modal = item.querySelector('.modal');

    if (!modal) {
      const modalBox = modalComponent(detail);
      item.appendChild(modalBox);
      item.scrollIntoView({ behavior: 'smooth' });
      item.classList.add('grid-modal');

      if (iso) iso.layout();
    } else if (target === img) {
      item.classList.remove('grid-modal');
      modal.remove();

      if (iso) iso.layout();
    }
  });

  return item;
};

const audioButtonComponent = function audioButtonComponent() {
  let isPlaying = false;

  const button = document.createElement('button');
  const icon = document.createElement('i');
  button.appendChild(icon);
  icon.classList.add('fas', 'fa-play');

  button.addEventListener('click', () => {
    if (!isPlaying) {
      audio.play();
      icon.classList.add('fa-pause');
      icon.classList.remove('fa-play');
    } else {
      audio.pause();
      icon.classList.add('fa-play');
      icon.classList.remove('fa-pause');
    }

    isPlaying = !isPlaying;
  });

  return button;
};

const loadAudio = function loadAudio(srcBlob: Blob) {
  const fr = new FileReader();
  fr.onload = function onLoad(e) {
    const result = e.target.result;
    if (typeof result === 'string') audio.src = result;

    audio.loop = true;
    audio.innerHTML = 'Your browser does not support the <code>audio</code> element.';
  };

  fr.readAsDataURL(srcBlob);
};

async function loadData() {
  let itemData = [];

  if (isMongo) {
    const { data, viewSize } = await fetchViewsMongo(serverUrl, loadedViews);
    loadedViews += viewSize;
    hasMore = loadedViews < viewsCount;
    itemData = data;
  } else {
    const { data, more, next } = await fetchViewsNotion(serverUrl, nextCursor);
    loadedViews += data.length;
    hasMore = more;
    nextCursor = next;
    itemData = data;
  }

  itemData.forEach((val) => {
    const itemComp = itemComponent(val);
    grid.appendChild(itemComp);

    if (iso) iso.appended(itemComp);
  });

  if (!iso) {
    const Isotope = await import('isotope-layout');
    iso = new Isotope(grid, {
      itemSelector: '.grid-item',
      percentPosition: true,
      masonry: {
        columnWidth: '.grid-sizer',
      },
    });
  }

  if (!imagesLoader) {
    const imagesLoaded = await import('imagesloaded');
    imagesLoader = imagesLoaded;

    imagesLoader(grid).on('progress', () => {
      iso.layout();
    });
  }
}

(async function fetchData() {
  const urls = [wThumbnail, mThumbnail, ...musics];
  let imageSrc = !isMobile ? wThumbnail : mThumbnail;

  if (isCacheAvailable) {
    const [wThumbnail, mThumbnail, ...musics] = await getData(urls);

    // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
    const imageBlog = URL.createObjectURL(
      !isMobile ? await wThumbnail.blob() : await mThumbnail.blob(),
    );
    imageSrc = imageBlog;

    Promise.all(musics.map((music) => music.blob()))
      .then((musics) => (musicList = musics))
      .then(() => {
        loadAudio(musicList[musicStartIndex]);
        percentController.appendChild(audioButtonComponent());
      });
  }

  const thumbnailImg = new Image();
  thumbnailImg.src = imageSrc;
  thumbnailImg.alt = 'Thumbnail';
  thumbnail.prepend(thumbnailImg);

  if (isMongo && !fetchViewsMongo) {
    const { fetchViewsMongo: fetchMongo, fetchViewsCount } = await import('./lib/fetchMongo');
    fetchViewsMongo = fetchMongo;

    viewsCount = await fetchViewsCount(serverUrl);
  } else if (!isMongo && !fetchViewsNotion) {
    const { default: fetchNotion } = await import('./lib/fetchNotion');
    fetchViewsNotion = fetchNotion;
  }

  setProgress(0);

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(async ({ target, isIntersecting }) => {
        if (isIntersecting) {
          const acClasses = audioContainer.classList;
          const targetClass = 'hide-container';
          if (target === thumbnail) {
            if (!acClasses.contains(targetClass)) acClasses.add(targetClass);
          } else if (target === main) {
            if (acClasses.contains(targetClass)) acClasses.remove(targetClass);
          } else if (target === loadMore && !isFetching && hasMore) {
            isFetching = true;
            await loadData();
            isFetching = false;
          }
        }
      });
    },
    { threshold: 1 },
  );

  observer.observe(main);
  observer.observe(thumbnail);
  observer.observe(loadMore);
})().catch((error) => {
  console.error({ error });
});

scrollButton.addEventListener('click', () => {
  grid.scrollIntoView({ behavior: 'smooth' });
});

audio.addEventListener('timeupdate', ({ target }) => {
  const { duration, currentTime } = target as HTMLAudioElement;
  const progressPercent = (currentTime / duration) * 100;
  setProgress(progressPercent);
});
