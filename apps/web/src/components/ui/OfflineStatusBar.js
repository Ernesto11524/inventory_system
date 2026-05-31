import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '../../utils/offlineSync';
import { format } from 'date-fns';
import clsx from 'clsx';
export function OfflineStatusBar() {
    const { isOnline, pendingCount, isSyncing, lastSyncTime, syncNow } = useOfflineSync();
    // Don't show anything if online and nothing pending
    if (isOnline && pendingCount === 0 && !isSyncing)
        return null;
    return (<div className={clsx('fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm font-medium transition-all', !isOnline
            ? 'bg-red-600 text-white'
            : isSyncing
                ? 'bg-amber-500 text-white'
                : pendingCount > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-green-500 text-white')}>
      <div className="flex items-center gap-2">
        {!isOnline ? (<>
            <WifiOff size={15}/>
            <span>You are offline — sales are being saved locally and will sync when internet returns</span>
          </>) : isSyncing ? (<>
            <RefreshCw size={15} className="animate-spin"/>
            <span>Syncing {pendingCount} pending sale{pendingCount !== 1 ? 's' : ''}…</span>
          </>) : pendingCount > 0 ? (<>
            <AlertCircle size={15}/>
            <span>{pendingCount} sale{pendingCount !== 1 ? 's' : ''} waiting to sync</span>
          </>) : (<>
            <CheckCircle size={15}/>
            <span>All sales synced {lastSyncTime ? `at ${format(lastSyncTime, 'HH:mm')}` : ''}</span>
          </>)}
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (<button onClick={() => syncNow()} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold transition-colors">
          <RefreshCw size={12}/> Sync Now
        </button>)}
    </div>);
}
//# sourceMappingURL=OfflineStatusBar.js.map