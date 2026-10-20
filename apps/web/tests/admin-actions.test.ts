import { beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { table: string; op: string; values?: Record<string, unknown> };

const calls: Call[] = [];
const removed: string[][] = [];
const state = {
  entry: null as unknown,
  rpcError: null as { message: string } | null,
  decision: 'decided',
};

vi.mock('@/lib/auth', () => ({ requireAdmin: async () => ({ email: 'admin@example.com' }) }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/features/entries/queries', () => ({ ENTRIES_TAG: 'entries' }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/features/moderation/queries', () => ({ getEntryForReview: async () => state.entry }));
vi.mock('@/features/moderation/decisions', () => ({ decideAsAdmin: async () => state.decision }));
vi.mock('@/features/submissions/speakers', () => ({ resolveSpeakerIds: async () => new Map() }));
vi.mock('@/lib/supabase/session', () => ({ createSessionClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => {
        calls.push({ table, op: 'update', values });
        return { eq: async () => ({ error: null }) };
      },
    }),
    rpc: async (name: string) => {
      calls.push({ table: 'rpc', op: name });
      return { error: state.rpcError };
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async (paths: string[]) => {
          removed.push(paths);
          return { error: null };
        },
      }),
    },
  }),
}));

const { saveEntry } = await import('@/features/admin/actions');

const ID = '10000000-0000-4000-8000-000000000001';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const OLD_PHOTO = { image_path: 'entries/old.png', image_alt: 'old alt' };

function entry(status: string) {
  return { id: ID, status, imagePath: 'entries/old.png', imageAlt: 'old alt', publishedAt: null };
}

function form(overrides: Record<string, unknown> = {}, withPhoto = false) {
  const data = new FormData();
  data.set(
    'payload',
    JSON.stringify({
      edit: { saidOn: '2026-01-05', lines: [{ kind: 'line', speaker: 'Pat', text: 'Hi' }] },
      status: 'pending',
      expectedStatus: 'pending',
      imageAlt: 'new alt',
      removeImage: false,
      intent: 'save',
      ...overrides,
    }),
  );
  if (withPhoto) data.set('image', new File([PNG], 'p.png', { type: 'image/png' }));
  return data;
}

beforeEach(() => {
  calls.length = 0;
  removed.length = 0;
  state.entry = entry('pending');
  state.rpcError = null;
  state.decision = 'decided';
});

describe('saveEntry', () => {
  it('refuses a stale form without touching the entry or the photo', async () => {
    state.entry = entry('published');
    const result = await saveEntry(ID, form({}, true));
    expect(result).toEqual({
      ok: false,
      message: 'This entry was changed by someone else; reload and try again.',
    });
    expect(calls).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('leaves the status alone when the admin did not change it', async () => {
    state.entry = entry('published');
    const result = await saveEntry(ID, form({ status: 'published', expectedStatus: 'published' }));
    expect(result).toEqual({ ok: true });
    expect(calls.some((c) => c.values && 'status' in c.values)).toBe(false);
  });

  it('applies a status change the admin made on a decided entry', async () => {
    state.entry = entry('published');
    const result = await saveEntry(ID, form({ status: 'rejected', expectedStatus: 'published' }));
    expect(result).toEqual({ ok: true });
    expect(calls).toContainEqual({
      table: 'entries',
      op: 'update',
      values: expect.objectContaining({ status: 'rejected', published_at: null }),
    });
  });

  it('puts the photo back and deletes the new file when the edit fails', async () => {
    state.rpcError = { message: 'boom' };
    await expect(saveEntry(ID, form({}, true))).rejects.toThrow('Could not save the entry');
    expect(calls.filter((c) => c.op === 'update').at(-1)?.values).toEqual(OLD_PHOTO);
    expect(removed).toHaveLength(1);
    expect(removed[0]?.[0]).toMatch(/^entries\/.+\.png$/);
    expect(removed[0]?.[0]).not.toBe('entries/old.png');
  });

  it('puts the photo back when someone else decided the entry first', async () => {
    state.decision = 'already_decided';
    const result = await saveEntry(ID, form({ intent: 'approve' }, true));
    expect(result).toMatchObject({ ok: false });
    expect(removed).toHaveLength(1);
    expect(calls.filter((c) => c.op === 'update').at(-1)?.values).toEqual(OLD_PHOTO);
  });
});
