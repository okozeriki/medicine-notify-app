// GitHub Actionsで実行するアップロードスクリプト
import { readdirSync, readFileSync } from "fs";
import { execSync } from "child_process";

const imageDir = "./generated-images";

const files = readdirSync(imageDir).filter((f) => f.endsWith(".png"));

console.log(`Uploading ${files.length} images to R2...`);

for (const file of files) {
	const filePath = `${imageDir}/${file}`;
	console.log(`Uploading: ${file}`);
	execSync(
		`bunx wrangler r2 object put medicine-images/${file} --file=${filePath} --content-type=image/png`,
		{ stdio: "inherit" }
	);
}

console.log(`\nDone! ${files.length} images uploaded.`);
