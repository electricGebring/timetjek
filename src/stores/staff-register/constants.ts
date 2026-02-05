import type { TimeRegistrationStatus } from "@/enums/TimeRegistrationStatus";

export const workEntryStatus: Record<TimeRegistrationStatus, { text: string; icon: string; class: string }> = {
	OPEN: {
		text: "På arbete",
		icon: "fas fa-clock",
		class: "text-blue-700"
	},
	CLOSED: {
		text: "Slutförd",
		icon: "fas fa-check",
		class: "text-green-700"
	},
	FORGOT_CHECK_OUT: {
		text: "Saknas tid",
		icon: "fas fa-exclamation",
		class: "text-red-700"
	},
	AWAITS_APPROVAL: {
		text: "Registrerad",
		icon: "fas fa-info",
		class: "text-orange-700"
	}
};
