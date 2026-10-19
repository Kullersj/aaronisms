import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveSpeakerIds } from '@/features/submissions/speakers';
import { createAdminClient } from '@/lib/supabase/admin';

const PREFIX = `spk${randomUUID().slice(0, 8)}`;

describe('resolveSpeakerIds (against the local database)', () => {
  const admin = createAdminClient();
  const line = (speaker: string | null, kind: 'line' | 'stage' = 'line') => ({
    kind,
    speaker,
    text: 'x',
  });

  afterAll(async () => {
    await admin.from('speakers').delete().like('slug', `${PREFIX}%`);
  });

  it('creates new speakers and reuses them on the next call', async () => {
    const first = await resolveSpeakerIds(admin, [line(`${PREFIX} One`), line(`${PREFIX} Two`)]);
    expect([...first.keys()].sort()).toEqual([`${PREFIX}-one`, `${PREFIX}-two`]);
    const again = await resolveSpeakerIds(admin, [line(`${PREFIX} One`)]);
    expect(again.get(`${PREFIX}-one`)).toBe(first.get(`${PREFIX}-one`));
  });

  it('matches spelling variants that share a slug to one speaker', async () => {
    const ids = await resolveSpeakerIds(admin, [
      line(`${PREFIX} Mary Jo`),
      line(`${PREFIX}-mary-jo`),
    ]);
    expect(ids.size).toBe(1);
    const { data } = await admin.from('speakers').select('id').eq('slug', `${PREFIX}-mary-jo`);
    expect(data).toHaveLength(1);
  });

  it('ignores stage directions and names with nothing to slug', async () => {
    expect((await resolveSpeakerIds(admin, [line(null, 'stage'), line('???')])).size).toBe(0);
  });

  it('is safe when two submissions create the same speaker at once', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => resolveSpeakerIds(admin, [line(`${PREFIX} Racer`)])),
    );
    const ids = new Set(results.map((r) => r.get(`${PREFIX}-racer`)));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toBeTruthy();
  });
});
