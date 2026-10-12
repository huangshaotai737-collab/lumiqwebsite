import fs from "node:fs";
import path from "node:path";

const locales = ["en", "zh-hant", "ja"];
const root = process.cwd();
const messages = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(root, "messages", `${locale}.json`), "utf8")),
  ]),
);

function flatten(value, prefix = "", output = new Map()) {
  for (const [key, item] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object") flatten(item, fullKey, output);
    else output.set(fullKey, item);
  }
  return output;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([\w]+)\}/g)].map((match) => match[1]).sort();
}

const flattened = Object.fromEntries(locales.map((locale) => [locale, flatten(messages[locale])]));
const source = flattened.en;
const errors = [];

for (const locale of locales) {
  const current = flattened[locale];
  for (const [key, sourceValue] of source) {
    if (!current.has(key)) errors.push(`${locale}: missing ${key}`);
    else if (typeof current.get(key) !== "string" || !current.get(key).trim()) errors.push(`${locale}: empty ${key}`);
    else if (placeholders(sourceValue).join() !== placeholders(current.get(key)).join()) errors.push(`${locale}: placeholders differ at ${key}`);
  }
  for (const key of current.keys()) {
    if (!source.has(key)) errors.push(`${locale}: extra ${key}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`i18n check passed: ${source.size} keys across ${locales.length} locales.`);
