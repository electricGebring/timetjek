export const TimeRegistrationStatus = {
	OPEN: "OPEN",
	CLOSED: "CLOSED",
	FORGOT_CHECK_OUT: "FORGOT_CHECK_OUT",
	AWAITS_APPROVAL: "AWAITS_APPROVAL"
} as const

export type TimeRegistrationStatus = typeof TimeRegistrationStatus[keyof typeof TimeRegistrationStatus]
