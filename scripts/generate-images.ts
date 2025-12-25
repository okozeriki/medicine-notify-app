import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";

const COLS = 4;
const ROWS = 7;
const PILL_SIZE = 50;
const PADDING = 20;
const GAP = 8;
const MEDICINE_MAX = 28;

const WIDTH = PADDING * 2 + COLS * PILL_SIZE + (COLS - 1) * GAP;
const HEIGHT = PADDING * 2 + ROWS * PILL_SIZE + (ROWS - 1) * GAP;

function getSnakeIndex(row: number, col: number): number {
	if (col % 2 === 0) {
		return col * ROWS + row;
	}
	return col * ROWS + (ROWS - 1 - row);
}

function generateSvg(remaining: number, hasTakenToday: boolean): string {
	const taken = MEDICINE_MAX - remaining;
	const todayIndex = hasTakenToday ? -1 : taken;
	const circles: string[] = [];

	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			const index = getSnakeIndex(row, col);
			const x = PADDING + col * (PILL_SIZE + GAP) + PILL_SIZE / 2;
			const y = PADDING + row * (PILL_SIZE + GAP) + PILL_SIZE / 2;
			const r = PILL_SIZE / 2 - 2;

			let fill: string;
			let stroke: string;

			if (index < taken) {
				fill = "#E0E0E0";
				stroke = "#BDBDBD";
			} else if (index === todayIndex && todayIndex < MEDICINE_MAX) {
				fill = "#FF5252";
				stroke = "#D32F2F";
			} else {
				fill = "#4CAF50";
				stroke = "#388E3C";
			}

			circles.push(
				`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`
			);

			if (index < taken) {
				const offset = r * 0.5;
				circles.push(
					`<line x1="${x - offset}" y1="${y - offset}" x2="${x + offset}" y2="${y + offset}" stroke="#9E9E9E" stroke-width="3" stroke-linecap="round"/>`,
					`<line x1="${x + offset}" y1="${y - offset}" x2="${x - offset}" y2="${y + offset}" stroke="#9E9E9E" stroke-width="3" stroke-linecap="round"/>`
				);
			}
		}
	}

	return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
		<rect width="100%" height="100%" fill="#FAFAFA"/>
		${circles.join("\n")}
	</svg>`;
}

async function generateAllImages() {
	const outputDir = "./generated-images";

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	let count = 0;

	// remaining: 0-28, taken: true/false
	for (let remaining = 0; remaining <= MEDICINE_MAX; remaining++) {
		for (const taken of [true, false]) {
			const svg = generateSvg(remaining, taken);
			const filename = `pills_${remaining}_${taken}.png`;

			await sharp(Buffer.from(svg))
				.png()
				.toFile(`${outputDir}/${filename}`);

			count++;
			console.log(`Generated: ${filename}`);
		}
	}

	console.log(`\nTotal: ${count} images generated in ${outputDir}/`);
}

generateAllImages();
