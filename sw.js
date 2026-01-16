const CACHE_NAME = 'my-pwa-v1';
const urlsToCache = [
    '/Content/Style/styles.css',
    '/Content/Style/style.css',
    '/manifest.json',
    '/Content/Unity/WebGLBuild/App.wasm',
    '/Content/Unity/WebGLBuild/App.framework.js',
    '/Content/Unity/WebGLBuild/App.data',
    '/Content/Icons/icon-192x192.png',
    '/Content/Icons/icon-512x512.png',
    '/Content/Bootstrap/css/bootstrap-select.min.css',
    '/Content/Bootstrap/css/bootstrap.min.css',
    '/Content/Unity/TemplateData/style.css',
    '/Content/JQuery/jquery.min.js',
    '/Content/Bootstrap/js/popper.min.js',
    '/Content/Bootstrap/js/bootstrap.min.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэширование файлов');
                return cache.addAll(urlsToCache);
            })
    );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Удаление старого кэша:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Перехват запросов
self.addEventListener('fetch', event => {
    const url = event.request.url;
    console.log(url);
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Возвращаем кэшированный файл или делаем запрос к сети
                return response || fetch(event.request);
            })
    );
});