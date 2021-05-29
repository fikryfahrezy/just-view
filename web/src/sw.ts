declare const self: ServiceWorkerGlobalScope;

import { setCacheNameDetails, skipWaiting } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

const cacheVersion = 1;
const cachePrefix = 'just-view';
const cacheName = `${cachePrefix}-${cacheVersion}-${process.env.CACHE_TIME}`;

setCacheNameDetails({
  prefix: cacheName,
});

precacheAndRoute(self.__WB_MANIFEST);

skipWaiting();

if ('index' in self.registration)
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!key.includes(cacheName)) {
              return caches.delete(key);
            }
          }),
        ),
      ),
    );
  });
