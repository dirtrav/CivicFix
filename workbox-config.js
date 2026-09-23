module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,json,webmanifest,png,ico,svg,woff,woff2,ttf}'],
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_expo\//],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'civicfix-map-tiles',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
};
