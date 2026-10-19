import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Vitest globalSetup shared by every package that tests against the real local Supabase stack
 * (Postgres + PostgREST + storage in Docker). Uses SUPABASE_URL / SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY when they are already set; otherwise reads them from
 * `supabase status`, starting the stack first if it is not running. The stack is left running
 * afterwards so reruns are fast.
 */
const DB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIPPED_SERVICES = 'realtime,imgproxy,studio,edge-runtime,logflare,vector,supavisor';
const KEYS = {
  API_URL: 'SUPABASE_URL',
  ANON_KEY: 'SUPABASE_ANON_KEY',
  SERVICE_ROLE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',
} as const;

const DOCKER_HINT =
  'Start Docker (for example Docker Desktop, or `sudo systemctl start docker`) and rerun the tests. ' +
  'Tests run against the real local Supabase stack; see the Database section of the README.';

function supabase(args: string[], inherit = false) {
  const bin = path.join(DB_DIR, 'node_modules', '.bin', 'supabase');
  return spawnSync(bin, args, {
    cwd: DB_DIR,
    encoding: 'utf8',
    stdio: inherit ? ['ignore', 'inherit', 'inherit'] : 'pipe',
  });
}

function readStatus(): Record<string, string> | null {
  const result = supabase(['status', '-o', 'env']);
  if (result.status !== 0) return null;
  const env: Record<string, string> = {};
  for (const line of result.stdout.split('\n')) {
    const match = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) env[match[1]] = match[2];
  }
  return Object.keys(KEYS).every((key) => env[key]) ? env : null;
}

export default function setup() {
  if (Object.values(KEYS).every((name) => process.env[name])) return;

  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
    throw new Error(`Docker is not available. ${DOCKER_HINT}`);
  }

  let status = readStatus();
  if (!status) {
    console.error('Local Supabase stack is not running; starting it (first run pulls images)...');
    const started = supabase(['start', '-x', SKIPPED_SERVICES], true);
    if (started.error || started.status !== 0) {
      throw new Error(`\`supabase start\` failed. ${DOCKER_HINT}`);
    }
    status = readStatus();
  }
  if (!status) throw new Error('Could not read credentials from `supabase status -o env`.');

  for (const [from, to] of Object.entries(KEYS)) {
    process.env[to] = status[from];
  }
}
