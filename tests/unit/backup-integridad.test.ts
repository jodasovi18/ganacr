import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { verifyBackup } from '../../scripts/verify-backup';

function setupDir(manifest: unknown, files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'verify-'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

test('verifyBackup: ok cuando los conteos coinciden con el manifest', () => {
  const dir = setupDir(
    { generadoEn: 'x', projectId: 'ganacr', colecciones: { lotes: 2 }, totalDocs: 2 },
    { 'lotes.ndjson': '{"id":"a","data":{}}\n{"id":"b","data":{}}\n' },
  );
  const r = verifyBackup(dir);
  assert.ok(r.ok, r.errores.join(','));
  assert.equal(r.totalDocs, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('verifyBackup: falla si el conteo no coincide con el manifest', () => {
  const dir = setupDir(
    { generadoEn: 'x', projectId: 'ganacr', colecciones: { lotes: 5 }, totalDocs: 5 },
    { 'lotes.ndjson': '{"id":"a","data":{}}\n' },
  );
  const r = verifyBackup(dir);
  assert.equal(r.ok, false);
  assert.ok(r.errores.some((e) => e.includes('lotes')));
  rmSync(dir, { recursive: true, force: true });
});

test('verifyBackup: falla con una línea de JSON corrupto', () => {
  const dir = setupDir(
    { generadoEn: 'x', projectId: 'ganacr', colecciones: { lotes: 1 }, totalDocs: 1 },
    { 'lotes.ndjson': '{roto\n' },
  );
  const r = verifyBackup(dir);
  assert.equal(r.ok, false);
  assert.ok(r.errores.some((e) => e.toLowerCase().includes('inválido')));
  rmSync(dir, { recursive: true, force: true });
});

test('verifyBackup: falla si no existe manifest.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verify-'));
  const r = verifyBackup(dir);
  assert.equal(r.ok, false);
  assert.ok(r.errores.some((e) => e.includes('manifest')));
  rmSync(dir, { recursive: true, force: true });
});
