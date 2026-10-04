import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, MIGRATIONS } from '../src/save/migrations.js';
import { SCHEMA_VERSION } from '../src/save/saveSchema.js';

test('MIGRATIONS vazia na v1; save atual não migra', () => {
  assert.deepEqual(MIGRATIONS, []);
  const raw = { schemaVersion: SCHEMA_VERSION, a: 1 };
  assert.deepEqual(migrate(raw), { save: raw, migrated: false });
});

test('migração fictícia v1→v2 é aplicada', () => {
  const fake = [{ from: 1, to: 2, migrate: (r) => ({ ...r, extra: r.a + 1 }) }];
  const r = migrate({ schemaVersion: 1, a: 1 }, fake);
  assert.deepEqual(r, { save: { schemaVersion: 2, a: 1, extra: 2 }, migrated: true });
});

test('schemaVersion 99 lança schema_futuro', () => {
  assert.throws(() => migrate({ schemaVersion: 99 }), { message: 'schema_futuro' });
});

test('versão antiga sem migração e entrada sem versão lançam invalido', () => {
  assert.throws(() => migrate({ schemaVersion: 0 }), { message: 'invalido' });
  assert.throws(() => migrate({}), { message: 'invalido' });
});
