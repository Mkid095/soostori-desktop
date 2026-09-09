import { useQuery } from '@tanstack/react-query'

export type AuthorityStatus = 'online' | 'stale' | 'lost' | 'unknown'

interface PrimaryStatusResult {
  status: AuthorityStatus
  label: string
  variant: 'success' | 'warning' | 'danger' | 'muted'
  canMutate: boolean
}

const STATUS_META: Record<AuthorityStatus, PrimaryStatusResult> = {
  online: { status: 'online', label: 'ONLINE', variant: 'success', canMutate: true },
  stale: { status: 'stale', label: 'STALE', variant: 'warning', canMutate: false },
  lost: { status: 'lost', label: 'LOST', variant: 'danger', canMutate: false },
  unknown: { status: 'unknown', label: 'UNKNOWN', variant: 'muted', canMutate: false },
}

export function usePrimaryStatus() {
  return useQuery<PrimaryStatusResult>({
    queryKey: ['primaryStatus'],
    queryFn: async () => {
      const result = await window.electronAPI?.db.syncGetAuthorityStatus() as
        { status: AuthorityStatus } | undefined
      const status = result?.status ?? 'unknown'
      return STATUS_META[status]
    },
    refetchInterval: 5_000,
    staleTime: 3_000,
  })
}
