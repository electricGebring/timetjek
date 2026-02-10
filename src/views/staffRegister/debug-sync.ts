import { triggerSyncIfOnline } from '@/domain/services/sync-trigger'

export async function debugSyncNow() {
  await triggerSyncIfOnline('manual')
}
