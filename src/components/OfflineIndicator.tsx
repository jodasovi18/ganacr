import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs sm:text-sm text-amber-800 shadow-md">
      📡 Sin conexión — tus cambios se guardan y se sincronizarán al volver la señal.
    </div>
  );
}
