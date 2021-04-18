//const cacheVersion = 1;
//const cachePrefix = 'just-view-';
//const cacheName = `${cachePrefix}${cacheVersion}`;

importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.1.1/workbox-sw.js'
);

const { setCacheNameDetails } = workbox.core;
const { precacheAndRoute } = workbox.precaching;
const { setCatchHandler } = workbox.routing;

setCacheNameDetails({
  prefix: 'just-view',
});

precacheAndRoute(self.__WB_MANIFEST);

// Catch routing errors, like if the user is offline
setCatchHandler(async ({ event }) => {
  // Return the precached offline page if a document is being requested
  if (event.request.destination === 'document') {
    return matchPrecache('/offline.html');
  }

  return Response.error();
});
