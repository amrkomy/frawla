// sw.js — معدّل ليدعم OneSignal + offline caching

// 🟢 1. استيراد OneSignal SDK أولًا (ضروري لتشغيل الإشعارات)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.js');

// 🟢 2. إعدادات التخزين (نُبقيها لكن ننظّف غير الضروري)
const CACHE_NAME = 'calamari-complaints-v2'; // غيّر الإصدار علشان يتجدد الكاش
const urlsToCache = [
  './',
  './index.html',
  './send.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
  // ❌ أزلنا مكتبات JS من CDN (Supabase, Chart.js) لأنها ديناميكية ولا تُخبّن جيدًا
];

// === التثبيت (Install) ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.warn('فشل تثبيت الكاش:', err))
  );
});

// === التنشيط (Activate) ===
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

// === جلب الموارد (Fetch) ===
self.addEventListener('fetch', (event) => {
  const { url, destination } = event.request;

  // 🚫 لا نتدخل في:
  // - طلبات OneSignal (الإشعارات، التحديثات)
  // - طلبات Push (مطلوبة لوصل الإشعارات)
  // - طلبات API (Supabase، Netlify Functions، إلخ)
  if (
    url.includes('onesignal.com') ||
    url.includes('OneSignalSDK') ||
    destination === 'push' ||
    url.includes('supabase.co') ||
    url.includes('.netlify/functions')
  ) {
    return; // دع النظام يتعامل معها مباشرةً
  }

  // ✅ باقي الطلبات: استخدم الكاش أولًا، ثم الشبكة
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // ✅ احفظ الاستجابة فقط لو كانت GET وناجحة
        if (event.request.method === 'GET' && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
