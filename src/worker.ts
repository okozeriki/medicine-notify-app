import { Hono } from "hono";
import { handleWebhook } from "./handlers/messageHandler";
import { hasTakenToday } from "./lib/dataStore";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Broadcast API で全ユーザーに送信
async function broadcast(text: string, env: Env): Promise<void> {
	await fetch("https://api.line.me/v2/bot/message/broadcast", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
		},
		body: JSON.stringify({ messages: [{ type: "text", text }] }),
	});
}

// スケジュールハンドラー
async function handleScheduled(env: Env, scheduledTime: Date): Promise<void> {
	const hour = scheduledTime.getUTCHours();
	const minute = scheduledTime.getUTCMinutes();

	// 21:00 JST (12:00 UTC) は常にリマインド
	const isFirstReminder = hour === 12 && minute === 0;

	// それ以外は飲んでない場合のみ
	if (!isFirstReminder) {
		const taken = await hasTakenToday(env.DB);
		if (taken) return;
	}

	const message = isFirstReminder
		? "💊 薬の時間だよ！"
		: "⏰ まだ薬飲んでないよ！";

	await broadcast(message, env);
}

// ヘルスチェック
app.get("/", (c) => {
	return c.text("LINE Bot is running!");
});

// LINE Webhook エンドポイント
app.post("/webhook", async (c) => {
	try {
		const signature = c.req.header("x-line-signature");
		if (!signature) {
			return c.json({ error: "Missing signature" }, 400);
		}

		const body = await c.req.text();

		// 署名検証
		const isValid = await verifySignature(
			body,
			signature,
			c.env.LINE_CHANNEL_SECRET,
		);
		if (!isValid) {
			return c.json({ error: "Invalid signature" }, 401);
		}

		const data = JSON.parse(body);
		await handleWebhook(data.events, c.env);

		return c.json({ success: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return c.json({ error: String(error) }, 500);
	}
});

// LINE署名検証
async function verifySignature(
	body: string,
	signature: string,
	channelSecret: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(channelSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signatureBuffer = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(body),
	);
	const expectedSignature = btoa(
		String.fromCharCode(...new Uint8Array(signatureBuffer)),
	);

	return signature === expectedSignature;
}

export default {
	fetch: app.fetch,
	scheduled: async (
		event: ScheduledEvent,
		env: Env,
		_ctx: ExecutionContext,
	) => {
		await handleScheduled(env, new Date(event.scheduledTime));
	},
};
