import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const sourcePath = resolve(root, '.env.local');
const outputPath = resolve(root, 'apps/mobile/.env.local');
const source = readFileSync(sourcePath, 'utf8');

function readEnvironmentValue(name) {
  const match = source.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!match?.[1]) throw new Error(`${name} is required in the root .env.local file.`);
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

const url = readEnvironmentValue('NEXT_PUBLIC_SUPABASE_URL');
const key = readEnvironmentValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

writeFileSync(outputPath, `EXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`);
console.log('Mobile public Supabase configuration is ready.');
