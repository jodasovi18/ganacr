import test from 'node:test';
import assert from 'node:assert/strict';
import { COLECCIONES } from '../../scripts/backup-format';

test('COLECCIONES contiene las 9 colecciones de Firestore', () => {
  assert.deepEqual([...COLECCIONES], [
    'users', 'fincas', 'lotes', 'animales', 'pesos',
    'gastos', 'gastosFinca', 'eventosSanitarios', 'ventas',
  ]);
});
