import type { WebhookEvent } from "@line/bot-sdk";
import {
	decreaseMedicine,
	getRemaining,
	hasTakenToday,
	increaseMedicine,
	takeMedicine,
} from "../lib/dataStore";
import { generatePillText } from "../lib/imageGenerator";
import type { Env } from "../types";

// メッセージ定数
const MESSAGES = {
	TAKEN_SUCCESS: (remaining: number) => `偉い👏 残り ${remaining} 個`,
	TAKEN_ALREADY: "今日はもう飲んでます",
	DECREASED: (remaining: number) => `減らしました！残り ${remaining} 個`,
	INCREASED: (remaining: number) => `増やしました！残り ${remaining} 個`,
	STATUS: (remaining: number) => `残り ${remaining} 個`,
	TODAY_YES: "今日は既に飲みました ✅",
	TODAY_NO: "今日はまだ飲んでません ❌",
};

// Webhookイベント処理
export async function handleWebhook(
	events: WebhookEvent[],
	env: Env,
): Promise<void> {
	for (const event of events) {
		await handleEvent(event, env);
	}
}

// イベント処理
async function handleEvent(event: WebhookEvent, env: Env): Promise<void> {
	if (event.type !== "message") {
		return;
	}

	if (event.message.type === "text") {
		await handleTextMessage(event.replyToken, event.message.text, env);
	}
}

// テキストメッセージ処理
async function handleTextMessage(
	replyToken: string,
	text: string,
	env: Env,
): Promise<void> {
	switch (text) {
		case "飲んだ":
			await handleTake(replyToken, env);
			break;
		case "残りの薬の個数":
			await handleStatus(replyToken, env);
			break;
		case "今日の薬":
			await handleTodayCheck(replyToken, env);
			break;
		case "減らす":
			await handleDecrease(replyToken, env);
			break;
		case "増やす":
			await handleIncrease(replyToken, env);
			break;
		default:
			await reply(replyToken, text, env);
	}
}

// LINE API返信
async function reply(
	replyToken: string,
	text: string,
	env: Env,
): Promise<void> {
	await replyMessages(replyToken, [{ type: "text", text }], env);
}

// LINE APIメッセージ送信
async function replyMessages(
	replyToken: string,
	messages: unknown[],
	env: Env,
): Promise<void> {
	await fetch("https://api.line.me/v2/bot/message/reply", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
		},
		body: JSON.stringify({ replyToken, messages }),
	});
}

// 薬シートのテキスト表示を生成
function getPillDisplay(remaining: number, taken: boolean, env: Env): string {
	const medicineMax = Number(env.MEDICINE_MAX) || 28;
	return generatePillText(remaining, taken, medicineMax);
}

// ============================================
// ハンドラー
// ============================================

async function handleTake(replyToken: string, env: Env): Promise<void> {
	const result = await takeMedicine(env);
	const message = result.success
		? MESSAGES.TAKEN_SUCCESS(result.remaining)
		: MESSAGES.TAKEN_ALREADY;
	await reply(replyToken, message, env);
}

async function handleStatus(replyToken: string, env: Env): Promise<void> {
	const remaining = await getRemaining(env.DB);
	const taken = await hasTakenToday(env.DB);
	const pillDisplay = getPillDisplay(remaining, taken, env);

	await reply(
		replyToken,
		`${MESSAGES.STATUS(remaining)}\n\n${pillDisplay}\n\n✕:飲んだ ●:今日 ○:残り`,
		env,
	);
}

async function handleTodayCheck(replyToken: string, env: Env): Promise<void> {
	const remaining = await getRemaining(env.DB);
	const taken = await hasTakenToday(env.DB);
	const pillDisplay = getPillDisplay(remaining, taken, env);

	await reply(
		replyToken,
		`${taken ? MESSAGES.TODAY_YES : MESSAGES.TODAY_NO}\n\n${pillDisplay}\n\n✕:飲んだ ●:今日 ○:残り`,
		env,
	);
}

async function handleDecrease(replyToken: string, env: Env): Promise<void> {
	const remaining = await decreaseMedicine(env);
	await reply(replyToken, MESSAGES.DECREASED(remaining), env);
}

async function handleIncrease(replyToken: string, env: Env): Promise<void> {
	const remaining = await increaseMedicine(env);
	await reply(replyToken, MESSAGES.INCREASED(remaining), env);
}
