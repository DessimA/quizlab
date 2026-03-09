self.importScripts('js/core/version.js');
const CACHE_NAME = `quizlab-v${self.APP_VERSION || '1'}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/core/version.js',
    '/js/core/config.js',
    '/js/core/storage-manager.js',
    '/js/core/validator.js',
    '/js/components/icon-system.js',
    '/js/components/theme-manager.js',
    '/js/components/focus-trap.js',
    '/js/components/modal-manager.js',
    '/js/components/toast-system.js',
    '/js/features/quiz-engine.js',
    '/js/features/library-manager.js',
    '/js/features/creator-manager.js',
    '/js/features/review-manager.js',
    '/js/features/review-quiz-builder.js',
    '/js/features/file-handler.js',
    '/js/ui/screen-manager.js',
    '/js/ui/quiz-renderer.js',
    '/js/ui/event-delegator.js',
    '/js/main.js',
];

const FONT_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (FONT_HOSTS.includes(url.hostname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    if (request.destination === 'document' || STATIC_ASSETS.some(p => url.pathname === p)) {
        event.respondWith(networkFirst(request));
        return;
    }
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
    } catch {
        return caches.match(request);
    }
}
