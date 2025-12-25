export type Env = {
	DB: D1Database;
	LINE_CHANNEL_SECRET: string;
	LINE_CHANNEL_ACCESS_TOKEN: string;
	MEDICINE_MAX: string;
	INITIAL_REMAINING: string;
};

export type MedicineStatus = {
	remaining: number;
	last_taken_at: string | null;
};

export type MedicineHistory = {
	id: number;
	taken_at: string;
	action: string;
};
