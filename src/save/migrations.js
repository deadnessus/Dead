import { SCHEMA_VERSION } from './saveSchema.js';

/** @type {{from:number, to:number, migrate(raw:object):object}[]} */
export const MIGRATIONS = [];

/**
 * Aplica em sequência toda migração com `from === raw.schemaVersion`.
 * @param {any} raw save lido do disco
 * @param {{from:number, to:number, migrate(raw:object):object}[]} [migrations]
 * @returns {{save:any, migrated:boolean}}
 * @throws {Error} 'schema_futuro' se version > SCHEMA_VERSION; 'invalido' se faltar migração
 */
export function migrate(raw, migrations = MIGRATIONS) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.schemaVersion)) throw new Error('invalido');
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('schema_futuro');
  let save = raw;
  let migrated = false;
  for (;;) {
    const m = migrations.find((x) => x.from === save.schemaVersion);
    if (!m) break;
    if (!(m.to > m.from)) throw new Error('invalido');
    save = { ...m.migrate(save), schemaVersion: m.to };
    migrated = true;
  }
  if (save.schemaVersion < SCHEMA_VERSION) throw new Error('invalido');
  return { save, migrated };
}
