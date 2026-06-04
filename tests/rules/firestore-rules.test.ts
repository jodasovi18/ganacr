import test, { before, after, beforeEach } from 'node:test';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'ganacr';
const UID_A = 'user-a';
const UID_B = 'user-b';
const NOW = '2026-06-03T00:00:00.000Z';

const COLECCIONES = ['users', 'fincas', 'lotes', 'animales', 'pesos', 'gastos', 'gastosFinca', 'eventosSanitarios', 'ventas'];

// users usa el uid como docId; el resto usa un id derivado
function docId(col: string, userId: string) {
  return col === 'users' ? userId : `${col}-de-${userId}`;
}

// doc base VÁLIDO por colección (pasa las nuevas validaciones)
function docBase(col: string, userId: string): any {
  const base: any = { userId, createdAt: NOW, updatedAt: NOW };
  switch (col) {
    case 'users':             return { id: userId, email: 'x@x.com', nombre: 'X', createdAt: NOW };
    case 'fincas':            return { ...base, nombre: 'Finca' };
    case 'lotes':             return { ...base, nombreLote: 'L', tipoPropiedad: 'propio', socio: null, totalInvertido: 0, fincaId: 'f' };
    case 'animales':          return { ...base, numeroArete: 'A1', estado: 'activo', pesoActual: 100, precioCompra: 0, fincaId: 'f', loteId: 'l' };
    case 'pesos':             return { ...base, peso: 100, animalId: 'a', loteId: 'l', fincaId: 'f' };
    case 'gastos':            return { ...base, monto: 1000, tipo: 'alimento', fincaId: 'f', loteId: 'l' };
    case 'gastosFinca':       return { ...base, montoTotal: 1000, fincaId: 'f' };
    case 'eventosSanitarios': return { ...base, costo: 1000, fincaId: 'f', loteId: 'l' };
    case 'ventas':            return { ...base, totalVenta: 1000, fincaId: 'f', loteId: 'l' };
    default:                  return base;
  }
}

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }, // conecta vía FIRESTORE_EMULATOR_HOST (lo setea emulators:exec)
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

// Precarga el doc de B saltando las reglas
async function seedDeB(col: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), col, docId(col, UID_B)), docBase(col, UID_B));
  });
}

// ── Aislamiento: A no puede tocar datos de B (parametrizado) ──
for (const col of COLECCIONES) {
  test(`aislamiento: A no lee ${col} de B`, async () => {
    await seedDeB(col);
    const dbA = env.authenticatedContext(UID_A).firestore();
    await assertFails(getDoc(doc(dbA, col, docId(col, UID_B))));
  });
  test(`aislamiento: A no borra ${col} de B`, async () => {
    await seedDeB(col);
    const dbA = env.authenticatedContext(UID_A).firestore();
    await assertFails(deleteDoc(doc(dbA, col, docId(col, UID_B))));
  });
  test(`aislamiento: A no crea ${col} con userId de B`, async () => {
    const dbA = env.authenticatedContext(UID_A).firestore();
    await assertFails(setDoc(doc(dbA, col, docId(col, UID_B)), docBase(col, UID_B)));
  });
  test(`sin auth: no lee ${col}`, async () => {
    await seedDeB(col);
    const dbN = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(dbN, col, docId(col, UID_B))));
  });
}

// ── Dueño feliz ──
test('dueño: A crea y lee su lote', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertSucceeds(setDoc(doc(dbA, 'lotes', 'l-a'), docBase('lotes', UID_A)));
  await assertSucceeds(getDoc(doc(dbA, 'lotes', 'l-a')));
});
test('dueño: A crea su animal', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertSucceeds(setDoc(doc(dbA, 'animales', 'an-a'), docBase('animales', UID_A)));
});

// ── Inmutabilidad de userId ──
test('inmutabilidad: A no puede cambiar el userId de su lote', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'lotes', 'l1'), docBase('lotes', UID_A));
  });
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertFails(updateDoc(doc(dbA, 'lotes', 'l1'), { userId: UID_B }));
});

// ── Tipos / enum inválidos ──
test('tipos: animal con pesoActual no-número → denegado', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertFails(setDoc(doc(dbA, 'animales', 'an1'), { ...docBase('animales', UID_A), pesoActual: 'cien' }));
});
test('enum: lote con tipoPropiedad inválido → denegado', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertFails(setDoc(doc(dbA, 'lotes', 'l2'), { ...docBase('lotes', UID_A), tipoPropiedad: 'otro' }));
});

// ── Tope de tamaño ──
test('tamaño: doc con demasiados campos → denegado', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  const gordo: any = { ...docBase('lotes', UID_A) };
  for (let i = 0; i < 45; i++) gordo[`extra${i}`] = i;
  await assertFails(setDoc(doc(dbA, 'lotes', 'l3'), gordo));
});
