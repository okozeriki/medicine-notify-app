import { Hono } from "hono";
import { handleWebhook } from "./handlers/messageHandler";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// ヘルスチェック
app.get("/", (c) => {
	return c.text("LINE Bot is running!");
});

// 薬シート画像エンドポイント（R2から取得）
app.get("/image/pills", async (c) => {
	try {
		const remaining = Number(c.req.query("remaining")) || 0;
		const takenToday = c.req.query("taken") === "true";

		const filename = `pills_${remaining}_${takenToday}.png`;
		const object = await c.env.IMAGES.get(filename);

		if (!object) {
			return c.text("Image not found", 404);
		}

		const headers = new Headers();
		headers.set("Content-Type", "image/png");
		headers.set("Cache-Control", "public, max-age=31536000");

		return new Response(object.body, { headers });
	} catch (error) {
		console.error("Image error:", error);
		return c.text(String(error), 500);
	}
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

export default app;
