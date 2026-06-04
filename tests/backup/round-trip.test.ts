// tests/backup/round-trip.test.ts — seed → export → clear → import → assert (contra el emulador).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { db, PROJECT_ID } from '../../scripts/backup-admin';
import { COLECCIONES } from '../../scripts/backup-format';
import { exportBackup } from '../../scripts/export-backup';
import { importBackup } from '../../scripts/import-backup';
import { verifyBackup } from '../../scripts/verify-backup';

const FH = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const NOW = '2026-06-03T00:00:00.000Z';

async function clearAll() {
  await fetch(`http://${FH}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
}

async function seed() {
  const batch = db.batch();
  batch.set(db.collection('users').doc('u1'), { id: 'u1', email: 'a@a.com', nombre: 'A', createdAt: NOW });
  batch.set(db.collection('fincas').doc('f1'), { userId: 'u1', nombre: 'Finca', createdAt: NOW });
  batch.set(db.collection('lotes').doc('l1'), { userId: 'u1', fincaId: 'f1', nombreLote: 'L', tipoPropiedad: 'propio', totalInvertido: 0, createdAt: NOW });
  batch.set(db.collection('animales').doc('a1'), { userId: 'u1', fincaId: 'f1', loteId: 'l1', numeroArete: 'A1', estado: 'activo', pesoActual: 100, precioCompra: 0, createdAt: NOW });
  batch.set(db.collection('animales').doc('a2'), { userId: 'u1', fincaId: 'f1', loteId: 'l1', numeroArete: 'A2', estado: 'activo', pesoActual: 120, precioCompra: 0, createdAt: NOW });
  await batch.commit();
}

let tmpDir: string;
before(async () => {
  await clearAll();
  await seed();
  tmpDir = mkdtempSync(join(tmpdir(), 'ganacr-backup-'));
});
after(async () => {
  await clearAll();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

test('round-trip: export → verify → clear → import restaura los conteos', async () => {
  const { dir, manifest } = await exportBackup(join(tmpDir, 'bk'));
  assert.equal(manifest.colecciones.animales, 2);
  assert.equal(manifest.colecciones.users, 1);
  assert.equal(manifest.totalDocs, 5);

  // integridad en disco
  const v = verifyBackup(dir);
  assert.ok(v.ok, `verify falló: ${v.errores.join(', ')}`);

  // limpiar e importar
  await clearAll();
  const restaurados = await importBackup(dir);
  assert.equal(restaurados, 5);

  // los conteos coinciden con el original
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).get();
    assert.equal(snap.size, manifest.colecciones[col], `colección ${col}`);
  }

  // un doc concreto se restauró con su id + data
  const a1 = await db.collection('animales').doc('a1').get();
  assert.ok(a1.exists);
  assert.equal(a1.data()?.numeroArete, 'A1');
  assert.equal(a1.data()?.pesoActual, 100);
});

test('salvaguarda: import sin --force aborta si el destino no está vacío', async () => {
  // el emulador ya tiene los 5 docs restaurados por el test anterior
  const { dir } = await exportBackup(join(tmpDir, 'bk2'));
  await assert.rejects(() => importBackup(dir), /no está vacío/i);
  // con force sí procede
  const n = await importBackup(dir, { force: true });
  assert.ok(n >= 5);
});
