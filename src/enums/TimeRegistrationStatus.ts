export const TimeRegistrationStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  FORGOT_CHECK_OUT: 'FORGOT_CHECK_OUT',
  AWAITS_APPROVAL: 'AWAITS_APPROVAL'
} as const

export type TimeRegistrationStatus = 'UNKNOWN' | 'CHECKED_IN' | 'CHECKED_OUT' | 'APPROVED' | 'REJECTED'
