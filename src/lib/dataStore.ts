import type { Env, MedicineHistory, MedicineStatus } from "../types";

// 今日の日付を取得 (YYYY-MM-DD)
function getToday(): string {
	return new Date().toISOString().slice(0, 10);
}

// 現在の状態を取得
async function getStatus(db: D1Database): Promise<MedicineStatus> {
	const result = await db
		.prepare("SELECT remaining, last_taken_at FROM medicine_status")
		.first<MedicineStatus>();
	return result || { remaining: 0, last_taken_at: null };
}

// 残り個数を取得
export async function getRemaining(db: D1Database): Promise<number> {
	const status = await getStatus(db);
	return status.remaining;
}

// 今日飲んだかチェック
export async function hasTakenToday(db: D1Database): Promise<boolean> {
	const status = await getStatus(db);
	return status.last_taken_at === getToday();
}

// 薬を飲んだ（1日1回制限）
export async function takeMedicine(
	env: Env,
): Promise<{ success: boolean; remaining: number }> {
	const db = env.DB;
	const medicineMax = Number(env.MEDICINE_MAX) || 28;

	if (await hasTakenToday(db)) {
		return { success: false, remaining: await getRemaining(db) };
	}

	const status = await getStatus(db);
	let newRemaining = status.remaining - 1;
	if (newRemaining <= 0) {
		newRemaining = medicineMax;
	}

	await db
		.prepare("UPDATE medicine_status SET remaining = ?, last_taken_at = ?")
		.bind(newRemaining, getToday())
		.run();
	await db
		.prepare("INSERT INTO medicine_history (taken_at, action) VALUES (?, ?)")
		.bind(new Date().toISOString(), "take")
		.run();

	return { success: true, remaining: newRemaining };
}

// 手動で減らす
export async function decreaseMedicine(env: Env): Promise<number> {
	const db = env.DB;
	const medicineMax = Number(env.MEDICINE_MAX) || 28;

	const status = await getStatus(db);
	if (status.remaining <= 0) return status.remaining;

	let newRemaining = status.remaining - 1;
	if (newRemaining <= 0) {
		newRemaining = medicineMax;
	}

	await db
		.prepare("UPDATE medicine_status SET remaining = ?")
		.bind(newRemaining)
		.run();
	await db
		.prepare("INSERT INTO medicine_history (taken_at, action) VALUES (?, ?)")
		.bind(new Date().toISOString(), "decrease")
		.run();

	return newRemaining;
}

// 手動で増やす
export async function increaseMedicine(env: Env): Promise<number> {
	const db = env.DB;
	const medicineMax = Number(env.MEDICINE_MAX) || 28;

	const status = await getStatus(db);
	if (status.remaining >= medicineMax) return status.remaining;

	const newRemaining = status.remaining + 1;

	await db
		.prepare("UPDATE medicine_status SET remaining = ?, last_taken_at = NULL")
		.bind(newRemaining)
		.run();
	await db
		.prepare("INSERT INTO medicine_history (taken_at, action) VALUES (?, ?)")
		.bind(new Date().toISOString(), "increase")
		.run();

	return newRemaining;
}

// 履歴取得
export async function getHistory(
	db: D1Database,
	limit = 10,
): Promise<MedicineHistory[]> {
	const result = await db
		.prepare("SELECT * FROM medicine_history ORDER BY id DESC LIMIT ?")
		.bind(limit)
		.all<MedicineHistory>();
	return result.results;
}
