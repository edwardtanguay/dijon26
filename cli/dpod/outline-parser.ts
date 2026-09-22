import * as fs from "fs";
import * as path from "path";
import * as qfil from "../qtools/qfil";
import * as qstr from "../qtools/qstr";
import * as qcli from "../qtools/qcli";

export interface OutlineItem {
	id: string;
	body: string;
	indent: number;
	image: string;
	isFlashcardHeader?: boolean;
	isFlashcardQuestion?: boolean;
	isFlashcardAnswer?: boolean;
	flashcardQuestionId?: string;
}

export class OutlineParser {
	static execute() {
		const parser = new OutlineParser();
		parser.parse();
	}

	parse() {
		const inputPath = "data/dijon.outline.dpod.txt";
		const outputDir = "data-parsed";
		const outputPath = "data-parsed/dijon.json";

		if (!qfil.fileExists(inputPath)) {
			qcli.message(`Fichier introuvable: ${inputPath}`, "error");
			return;
		}

		const lines = qfil.getLinesFromFile(inputPath);
		const items: OutlineItem[] = [];

		let ignoredIndent: number | null = null;
		let currentFlashcardHeaderIndent: number | null = null;
		let currentQuestionId: string | null = null;
		let currentHeaderItem: OutlineItem | null = null;
		let currentSectionFlashcardCount = 0;

		const finalizeCurrentFlashcardHeader = () => {
			if (currentHeaderItem) {
				currentHeaderItem.body = `${currentHeaderItem.body} (${currentSectionFlashcardCount})`;
				currentHeaderItem = null;
			}
			currentSectionFlashcardCount = 0;
		};

		for (const line of lines) {
			if (qstr.isEmpty(line)) {
				continue;
			}

			// Calculate indent count (leading tabs)
			let indent = 0;
			while (indent < line.length && line.charAt(indent) === "\t") {
				indent++;
			}

			// Strip leading tabs
			let content = line.substring(indent);

			// Strip "- " prefix if present
			if (content.startsWith("- ")) {
				content = content.substring(2);
			} else if (content.startsWith("-")) {
				content = content.substring(1);
			}

			// Check ignore logic for "nnn" and all its children
			if (ignoredIndent !== null) {
				if (indent > ignoredIndent) {
					continue;
				} else {
					ignoredIndent = null;
				}
			}

			if (content.trim() === "nnn") {
				ignoredIndent = indent;
				continue;
			}

			// Check flashcard scope
			if (currentFlashcardHeaderIndent !== null && indent <= currentFlashcardHeaderIndent) {
				finalizeCurrentFlashcardHeader();
				currentFlashcardHeaderIndent = null;
				currentQuestionId = null;
			}

			let isFlashcardHeader = false;
			let isFlashcardQuestion = false;
			let isFlashcardAnswer = false;
			let flashcardQuestionId: string | undefined = undefined;

			// Check if line ends with %%flashcards
			if (/%%flashcards\s*$/.test(content)) {
				finalizeCurrentFlashcardHeader();
				content = content.replace(/%%flashcards\s*$/, "").trimEnd();
				isFlashcardHeader = true;
				currentFlashcardHeaderIndent = indent;
				currentQuestionId = null;
			} else if (currentFlashcardHeaderIndent !== null) {
				if (indent === currentFlashcardHeaderIndent + 1) {
					isFlashcardQuestion = true;
				} else if (indent > currentFlashcardHeaderIndent + 1) {
					isFlashcardAnswer = true;
					flashcardQuestionId = currentQuestionId || undefined;
				}
			}

			let image = "";
			const tagMatch = content.match(/##([a-zA-Z0-9_\-]+)\s*$/);
			if (tagMatch) {
				const tag = tagMatch[1];
				// Remove tag from content
				content = content.replace(/##[a-zA-Z0-9_\-]+\s*$/, "").trimEnd();

				// Search in public/images/outline for file with matching name and extension
				const outlineImgDir = "public/images/outline";
				let foundFileName = "";
				if (qfil.directoryExists(outlineImgDir)) {
					const files = fs.readdirSync(outlineImgDir);
					const matchedFile = files.find((f) => {
						const ext = path.extname(f).toLowerCase();
						const base = path.basename(f, path.extname(f)).toLowerCase();
						return (
							base === tag.toLowerCase() &&
							[".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
						);
					});
					if (matchedFile) {
						foundFileName = matchedFile;
					}
				}

				if (foundFileName) {
					image = foundFileName;
				} else {
					image = `NOT_FOUND:${tag}`;
				}
			}

			if (isFlashcardQuestion) {
				currentSectionFlashcardCount++;
				// Strip any existing number prefix like "1. ", "1) ", etc.
				content = content.replace(/^(\d+[\.\)]\s*)+/, "").trimStart();
				content = `${currentSectionFlashcardCount}. ${content}`;
			}

			const id = qstr.generateSuuid();
			if (isFlashcardQuestion) {
				currentQuestionId = id;
			}

			const item: OutlineItem = {
				id,
				body: content,
				indent,
				image
			};

			if (isFlashcardHeader) {
				item.isFlashcardHeader = true;
				currentHeaderItem = item;
				currentSectionFlashcardCount = 0;
			}
			if (isFlashcardQuestion) item.isFlashcardQuestion = true;
			if (isFlashcardAnswer) {
				item.isFlashcardAnswer = true;
				if (flashcardQuestionId) item.flashcardQuestionId = flashcardQuestionId;
			}

			items.push(item);
		}

		finalizeCurrentFlashcardHeader();

		if (!qfil.directoryExists(outputDir)) {
			qfil.createDirectory(outputDir);
		}

		qfil.saveArrayOfObjectsToJsonFile(items, outputPath);
		qcli.message(`Données converties avec succès dans ${outputPath} (${items.length} éléments)`, "success");
	}
}
