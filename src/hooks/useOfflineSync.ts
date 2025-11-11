import { useEffect, useState } from 'react';
import { offlineSync } from '../services/offlineSync';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Back online - starting sync...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Gone offline - data will sync when back online');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending syncs count
    const updatePendingSyncs = () => {
      setPendingSyncs(offlineSync.getSyncQueue().length);
    };

    // Check every 5 seconds
    const interval = setInterval(updatePendingSyncs, 5000);
    updatePendingSyncs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    pendingSyncs,
    addToSyncQueue: offlineSync.addToSyncQueue.bind(offlineSync),
    storeOffline: offlineSync.storeOffline.bind(offlineSync),
    getOffline: offlineSync.getOffline.bind(offlineSync),
    syncWhenOnline: offlineSync.syncWhenOnline.bind(offlineSync)
  };
};

