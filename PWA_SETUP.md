# PWA & Offline Sync Setup Guide

## ✅ What's Been Configured

### 1. PWA Plugin (vite-plugin-pwa)
- ✅ Service worker registration
- ✅ App manifest for installability
- ✅ Offline caching strategies
- ✅ Auto-update on new versions

### 2. Offline Sync Service
- ✅ IndexedDB for offline data storage
- ✅ Sync queue for pending operations
- ✅ Automatic sync when back online
- ✅ Retry mechanism for failed syncs

### 3. UI Components
- ✅ Offline indicator component
- ✅ Online/offline status detection
- ✅ Pending sync count display

---

## 🚀 How It Works

### Offline Mode
1. When offline, data is stored in IndexedDB
2. Operations are queued for sync
3. User can continue working normally
4. Visual indicator shows offline status

### Online Sync
1. When back online, sync automatically starts
2. Queued operations are processed
3. Failed operations are retried (up to 5 times)
4. Success indicator shows sync progress

### Caching Strategy
- **API calls**: NetworkFirst (tries network, falls back to cache)
- **Images**: CacheFirst (uses cache, updates in background)
- **Static assets**: Cached automatically

---

## 📱 Using Offline Sync in Your Code

### Example: Creating a Transaction Offline

```typescript
import { useOfflineSync } from '../hooks/useOfflineSync';
import api from '../services/api';

const { isOnline, addToSyncQueue } = useOfflineSync();

const createTransaction = async (transactionData: any) => {
  if (isOnline) {
    // Try to create online
    try {
      await api.post('/transactions', transactionData);
    } catch (error) {
      // If fails, add to sync queue
      await addToSyncQueue('transaction', 'create', transactionData);
    }
  } else {
    // Offline - add to sync queue
    await addToSyncQueue('transaction', 'create', transactionData);
  }
};
```

### Example: Syncing When Online

```typescript
import { useOfflineSync } from '../hooks/useOfflineSync';
import api from '../services/api';

const { syncWhenOnline } = useOfflineSync();

// Set up sync handler
useEffect(() => {
  syncWhenOnline(async (item) => {
    try {
      switch (item.type) {
        case 'transaction':
          if (item.action === 'create') {
            await api.post('/transactions', item.data);
            return true;
          }
          break;
        // Add other types...
      }
      return false;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  });
}, []);
```

---

## 🎨 PWA Features

### Installable App
- Users can install the app on their device
- Works like a native app
- Appears in app drawer/home screen

### Offline Support
- App works without internet
- Data syncs when connection restored
- No data loss

### Fast Loading
- Cached assets load instantly
- Reduced server load
- Better user experience

---

## 🔧 Configuration

### Manifest (vite.config.ts)
- App name: "POS System"
- Theme color: Blue (#3B82F6)
- Display mode: Standalone
- Icons: 192x192 and 512x512 (you need to add these)

### Service Worker
- Auto-updates enabled
- Caches API responses
- Caches static assets
- Background sync ready

---

## 📝 Next Steps

### 1. Add PWA Icons
Create these files in `public/`:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)
- `apple-touch-icon.png` (180x180 pixels)

You can use tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

### 2. Test Offline Mode
1. Open browser DevTools
2. Go to Network tab
3. Check "Offline" checkbox
4. Try using the app
5. Check IndexedDB in Application tab

### 3. Test Installation
1. Build the app: `npm run build`
2. Serve it: `npm run preview`
3. Open in browser
4. Look for install prompt
5. Or use browser menu: "Install App"

---

## 🐛 Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure HTTPS (required for service workers)
- Clear browser cache
- Check `vite.config.ts` PWA settings

### Offline Sync Not Working
- Check IndexedDB in DevTools
- Verify `offlineSync.init()` is called
- Check browser console for errors
- Ensure sync handler is set up

### App Not Installable
- Check manifest.json is generated
- Verify icons exist
- Ensure HTTPS (required)
- Check browser support

---

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

---

## ✅ Checklist

- [x] PWA plugin installed
- [x] Service worker configured
- [x] Offline sync service created
- [x] Offline indicator component
- [x] Hook for offline sync
- [ ] Add PWA icons (you need to create these)
- [ ] Test offline functionality
- [ ] Test installation
- [ ] Deploy to Vercel

---

Your app is now ready for offline sync! 🎉

