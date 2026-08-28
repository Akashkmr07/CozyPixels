import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(root, 'desktop/package.json'), 'utf8'));
const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
const heading = `## [${packageJson.version}]`;
const start = changelog.indexOf(heading);

if (start === -1) {
  throw new Error(`Missing changelog section for ${packageJson.version}`);
}

const nextSection = changelog.indexOf('\n## [', start + heading.length);
const body = changelog.slice(start, nextSection === -1 ? undefined : nextSection).trim();
const outputPath = process.env.GITHUB_OUTPUT;

if (!outputPath) {
  process.stdout.write(`${body}\n`);
} else {
  appendFileSync(outputPath, `body<<RELEASE_NOTES\n${body}\nRELEASE_NOTES\n`);
}
