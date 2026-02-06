/**
 * Reusable status for whether the user is currently checked in or checked out.
 * Use across domain, stores, and UI when representing current check-in state.
 */
export const CheckInOutStatus = {
  CHECKED_IN: 'checked-in',
  CHECKED_OUT: 'checked-out'
} as const

export type CheckInOutStatus = (typeof CheckInOutStatus)[keyof typeof CheckInOutStatus]
