import 'lazysizes';
import 'lazysizes/plugins/blur-up/ls.blur-up';
import 'lazysizes/plugins/object-fit/ls.object-fit';
import 'lazysizes/plugins/parent-fit/ls.parent-fit';
import './styles.css';
import type { FetchState, ViewComponentData, ViewDetailData } from './type';
import { fetchMusics, fetchViews } from './lib/fetchNotion';

const cacheVersion = 1;
const cachePrefix = 'just-view';
const cacheName = `${cachePrefix}-${cacheVersion}-${process.env.CACHE_TIME}`;
const serverUrl = process.env.SERVER_NOTION;
const wThumbnail = process.env.W_THUMBNAIL;
const mThumbnail = process.env.M_THUMBNAIL;

// https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device
const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent);
const grid = document.getElementById('grid');
const scrollButton = document.getElementById('scroll-button');
const loadMore = document.getElementById('load-more');
const thumbnail = document.getElementById('thumbnail');
const main = document.getElementById('main');
const audio = document.getElementById('audio') as HTMLAudioElement;
const circle = document.getElementById('progress') as unknown as SVGCircleElement;
const percentController = document.getElementById('percent-contoller');
const isCacheAvailable = 'caches' in window;

let observer = null;
let iso: Isotope | null = null;

let musicList: string[] = [];
let isMusicPlaying = false;
let musicStartIndex = 0;

const viewsServerState: FetchState = {
  isFetching : false,
  hasMore :true,
  nextCursor: null,
}

const musicServerState: FetchState = {
  isFetching : false,
  hasMore :true,
  nextCursor: null,
}

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
  if (!isCacheAvailable) {
    return null
  }

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
  const offset = circumference - (percent / 100) * circumference;

  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = `${circumference}`;
  circle.style.strokeDashoffset = String(offset);
};

const loadAudio = function loadAudio(src: Blob | string) {
  if (typeof src === 'string') {
    audio.src = src;
    audio.loop = true;
    return
  }

  const fr = new FileReader();
  fr.onload = function onLoad(e) {
    const result = e.target.result;
    if (typeof result === 'string') audio.src = result;

    audio.loop = true;
  };

  fr.readAsDataURL(src);
};

const thumbnailComponent = function thumbnailComponent(imageSrc: string) {
  const thumbnailImg = new Image();

  thumbnailImg.src = imageSrc;
  thumbnailImg.alt = 'Thumbnail';
  thumbnail.prepend(thumbnailImg);
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
}: ViewDetailData) {
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

const itemComponent = function itemComponent({ main, detail }: ViewComponentData) {
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
  const button = document.createElement('button');
  const icon = document.createElement('i');
  button.appendChild(icon);
  icon.classList.add('fas', 'fa-play');

  button.addEventListener('click', () => {
    if (!isMusicPlaying) {
      audio.play();
      icon.classList.add('fa-pause');
      icon.classList.remove('fa-play');
    } else {
      audio.pause();
      icon.classList.add('fa-play');
      icon.classList.remove('fa-pause');
    }

    isMusicPlaying = !isMusicPlaying;
  });

  return button;
};

const showHideAudioContoller = function showHideAudioContoller(isIntersecting: boolean) {
  // const acClasses = audioContainer.classList;
  // const targetClass = 'hide-container';
  //
  // if (isIntersecting && acClasses.contains(targetClass)) acClasses.remove(targetClass);
  // else if (!acClasses.contains(targetClass)) acClasses.add(targetClass);
};

const appendItemComponent = function appendItemComponent(itemData: ViewComponentData[]) {
  itemData.forEach((val) => {
    const itemComp = itemComponent(val);
    grid.appendChild(itemComp);

    if (iso) iso.appended(itemComp);
  });
};

const importIso = async function importIso() {
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
};

async function loadViews() {
  if (viewsServerState.isFetching || !viewsServerState.hasMore) {
    return
  }

  viewsServerState.isFetching = true;

  const { data, more, next } = await fetchViews(serverUrl, viewsServerState.nextCursor);
  viewsServerState.hasMore = more;
  viewsServerState.nextCursor = next;

  appendItemComponent(data);
  viewsServerState.isFetching = false;
}

async function loadMusics() {
  musicServerState.isFetching = true;

  const { data, more, next } = await fetchMusics(serverUrl, musicServerState.nextCursor);
  musicServerState.hasMore = more;
  musicServerState.nextCursor = next;

  musicList = data.map((music) => music.url)
  musicServerState.isFetching = false;
}

async function setupMusic() {
  loadAudio(musicList[musicStartIndex]);
  percentController.appendChild(audioButtonComponent());
}

scrollButton.addEventListener('click', () => {
  grid.scrollIntoView({ behavior: 'smooth' });
  audio.play();
  isMusicPlaying = true;
});

audio.addEventListener('timeupdate', ({ target }) => {
  const { duration, currentTime } = target as HTMLAudioElement;
  const progressPercent = (currentTime / duration) * 100;
  setProgress(progressPercent);
});

(async function init() {
  const urls = [wThumbnail, mThumbnail];
  let imageSrc = !isMobile ? wThumbnail : mThumbnail;

  const cachedData = await getData(urls);
  if (cachedData) {
    const [wThumbnail, mThumbnail] = cachedData
    // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
    const imageBlob = URL.createObjectURL(
      await (isMobile ? mThumbnail : wThumbnail).blob(),
    );
    imageSrc = imageBlob;
  }

  thumbnailComponent(imageSrc);

  setProgress(0);
  await loadViews()
  await importIso();

  await loadMusics();
  await setupMusic();

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(async ({ target, isIntersecting }) => {
        if (isIntersecting) {
          if (target === loadMore) {
            await loadViews();
          } else {
            showHideAudioContoller(target === thumbnail);
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
