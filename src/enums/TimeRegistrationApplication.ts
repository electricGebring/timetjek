export const TimeRegistrationApplication = {
	APP: "APP",
	CLOCK: "CLOCK",
	USER: "USER"
} as const

export type TimeRegistrationApplication = typeof TimeRegistrationApplication[keyof typeof TimeRegistrationApplication]
