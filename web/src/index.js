import config from './config.json';
import 'lazysizes';
import 'lazysizes/plugins/blur-up/ls.blur-up';
import 'lazysizes/plugins/object-fit/ls.object-fit';
import 'lazysizes/plugins/parent-fit/ls.parent-fit';
import './styles.css';

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

const cacheVersion = 1;
const cachePrefix = 'just-view-';
const cacheName = `${cachePrefix}${cacheVersion}`;

// https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device
const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile/i.test(
  navigator.userAgent
);
const serverUrl = config.serverUrl || '...';
const grid = document.getElementById('grid');
const scrollButton = document.getElementById('scroll-button');
const loadMore = document.getElementById('load-more');
const thumbnail = document.getElementById('thumbnail');
const main = document.getElementById('main');
const audioContainer = document.getElementById('audio-container');
const audio = document.getElementById('audio');
const circle = document.getElementById('progress');
const percentController = document.getElementById('percent-contoller');
const isCacheAvailable = 'caches' in window;
let observer = null;
let iso = null;
let isFetching = false;
let viewsCount = 0;
let loadedViews = 0;
let musicStartIndex = 0;
let musicList = [];

const modalAnchorComponent = function modalAnchorComponent(link) {
  const anchor = document.createElement('a');
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.href = link;

  return anchor;
};

const modalComponent = function modalComponent(data) {
  const { name, source, source_link, lat, lng } = data;

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

  const mapLink = modalAnchorComponent(
    `https://maps.google.com/?q=${lat},${lng}`
  );
  descDiv.appendChild(mapLink);

  const button = document.createElement('button');
  mapLink.appendChild(button);

  const pinIcon = document.createElement('i');
  button.appendChild(pinIcon);
  pinIcon.classList.add('fas', 'fa-map-marker-alt');
  button.append('Map');

  return descDiv;
};

const itemComponent = function itemComponent(data) {
  const { main, detail } = data;
  const { url, thumbnail, height, width, name } = main;

  const item = document.createElement('div');
  item.classList.add('grid-item');

  const mediaBox = document.createElement('div');
  item.appendChild(mediaBox);
  mediaBox.classList.add('mediabox');

  const img = document.createElement('img');
  mediaBox.appendChild(img);
  img.classList.add('media-box', 'lazyload', 'img');
  img.dataset.sizes = 'auto';
  img.dataset.lowsrc = thumbnail;
  img.dataset.src = url;
  img.width = width;
  img.height = height;
  img.alt = name;

  item.onclick = function onClick({ target }) {
    const modal = this.querySelector('.modal');

    if (!modal) {
      const modalBox = modalComponent(detail);
      this.appendChild(modalBox);
      this.scrollIntoView({ behavior: 'smooth' });
      this.classList.add('grid-modal');
      if (iso) iso.layout();
    } else if (target === img) {
      this.classList.remove('grid-modal');
      modal.remove();
      if (iso) iso.layout();
    }
  };

  return item;
};

const audioButtonComponent = function audioButtonComponent() {
  let isPlaying = false;

  const button = document.createElement('button');
  const icon = document.createElement('i');
  button.appendChild(icon);
  icon.classList.add('fas', 'fa-play');

  button.onclick = function onClick() {
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
  };

  return button;
};

const loadAudio = function loadAudio(srcBlob) {
  const fr = new FileReader();
  fr.onload = function onLoad(e) {
    audio.src = e.target.result;
    audio.loop = true;
    audio.innerHTML =
      'Your browser does not support the <code>audio</code> element.';
  };

  fr.readAsDataURL(srcBlob);
};

/**
 * Building a Progress Ring, Quickly
 * https://css-tricks.com/building-progress-ring-quickly/
 */
const setProgress = function setProgress(percent) {
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;

  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = `${circumference}`;

  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
};

const fetchViewsCount = async function fetViews() {
  try {
    const res = await fetch(`https://${serverUrl}/views/count`);
    viewsCount = await res.json();
  } catch (err) {
    console.log(err);
  }
};

const fetchViews = async function fetViews(start = 0) {
  try {
    const res = await fetch(
      `https://${serverUrl}/views?_limit=10&_start=${start}`
    );
    const body = await res.json();
    loadedViews += body.length;
    const data = body.map(({ name, source, source_link, lat, lng, image }) => {
      const { width, height, url, formats } = image;
      const thumbnail = formats.thumbnail.url;
      const main = {
        url,
        thumbnail,
        width,
        height,
        name,
      };
      const detail = {
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
    });

    data.forEach((val) => {
      const itemComp = itemComponent(val);
      grid.appendChild(itemComp);

      if (iso) iso.appended(itemComp);
    });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Cache related refrences
 * https://googlechrome.github.io/samples/service-worker/window-caches/
 * https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
 * https://developer.mozilla.org/en-US/docs/Web/API/Cache
 * https://web.dev/cache-api-quick-guide/
 * https://gist.github.com/hscstudio/3f2046acfa31a4211c175c790468c7ee
 */
// Try to get data from the cache, but fall back to fetching it live.
async function getData(urls) {
  let cachedData = await getCachedData(cacheName, urls);

  if (cachedData) {
    return cachedData;
  }

  const cacheStorage = await caches.open(cacheName);
  await cacheStorage.addAll(urls);
  cachedData = await getCachedData(cacheName, urls);
  await deleteOldCaches(cacheName);

  return cachedData;
}

// Get data from the cache.
async function getCachedData(cacheName) {
  const cacheStorage = await caches.open(cacheName);
  const cacheKeys = await cacheStorage.keys();
  const matchedCaches = await Promise.all(
    cacheKeys.map((key) => cacheStorage.match(key))
  );
  const isOk = matchedCaches.reduce(
    (_, curr) => (curr && curr.ok ? true : false),
    false
  );

  return isOk && matchedCaches;
}

// Delete any old caches to respect user's disk space.
async function deleteOldCaches(currentCache) {
  const keys = await caches.keys();
  keys.forEach((key) => {
    const isOurCache = cachePrefix === key.substr(0, cachePrefix.length);
    if (currentCache !== key && isOurCache) {
      caches.delete(key);
    }
  });
}

(async function fetchData() {
  try {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async ({ target, isIntersecting }) => {
          if (isIntersecting) {
            const acClasses = audioContainer.classList;
            const targerClass = 'hide-container';
            if (target === thumbnail) {
              if (!acClasses.contains(targerClass)) {
                acClasses.add(targerClass);
              }
            } else if (target === main) {
              if (acClasses.contains(targerClass)) {
                acClasses.remove(targerClass);
              }
            } else if (
              target === loadMore &&
              !isFetching &&
              loadedViews < viewsCount
            ) {
              isFetching = true;
              await fetchViews(loadedViews);
              isFetching = false;
            }
          }
        });
      },
      { threshold: 1 }
    );

    const urls = [config.wThumbnail, config.mThumbnail, ...config.musics];
    let imageSrc = !isMobile ? config.wThumbnail : config.mThumbnail;

    if (isCacheAvailable) {
      const [wThumbnail, mThumbnail, ...musics] = await getData(urls);

      // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
      const imageBlog = URL.createObjectURL(
        !isMobile ? await wThumbnail.blob() : await mThumbnail.blob()
      );
      imageSrc = imageBlog;

      Promise.all(musics.map((music) => music.blob()))
        .then((musics) => (musicList = musics))
        .then(() => loadAudio(musicList[musicStartIndex]))
        .finally(() => percentController.appendChild(audioButtonComponent()));
    }

    const thumbnailImg = new Image();
    thumbnailImg.src = imageSrc;
    thumbnailImg.alt = 'Thumbnail';
    thumbnail.prepend(thumbnailImg);

    const [, isoLayout] = await Promise.all([
      fetchViewsCount(),
      import('isotope-layout'),
    ]);
    const { default: Isotope } = isoLayout;
    iso = new Isotope(grid, {
      itemSelector: '.grid-item',
      percentPosition: true,
      masonry: {
        columnWidth: '.grid-sizer',
      },
    });

    observer.observe(main);
    observer.observe(thumbnail);
    observer.observe(loadMore);

    setProgress(0);
  } catch (error) {
    console.error({ error });
  }
})();

scrollButton.onclick = function onClick() {
  grid.scrollIntoView({ behavior: 'smooth' });
};

audio.ontimeupdate = function onTimeUpdate({ srcElement }) {
  const { duration, currentTime } = srcElement;
  const progressPercent = (currentTime / duration) * 100;
  setProgress(progressPercent);
};
