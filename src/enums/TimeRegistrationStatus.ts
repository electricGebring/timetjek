export const TimeRegistrationStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  FORGOT_CHECK_OUT: 'FORGOT_CHECK_OUT',
  AWAITS_APPROVAL: 'AWAITS_APPROVAL'
} as const

export type TimeRegistrationStatus = 'OPEN' | 'CLOSED' | 'FORGOT_CHECK_OUT' | 'AWAITS_APPROVAL'
