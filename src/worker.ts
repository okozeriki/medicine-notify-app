import { Hono } from "hono";
import { handleWebhook } from "./handlers/messageHandler";
import { generatePillSvg } from "./lib/imageGenerator";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// ヘルスチェック
app.get("/", (c) => {
	return c.text("LINE Bot is running!");
});

// 薬シートSVG画像エンドポイント
app.get("/image/pills", (c) => {
	const remaining = Number(c.req.query("remaining")) || 0;
	const takenToday = c.req.query("taken") === "true";
	const medicineMax = Number(c.env.MEDICINE_MAX) || 28;

	const svg = generatePillSvg(remaining, takenToday, medicineMax);

	return new Response(svg, {
		headers: { "Content-Type": "image/svg+xml" },
	});
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
