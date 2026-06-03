// scripts/seed-emulator.ts — limpia el emulador y siembra los fixtures de E2E.
import { db, auth, PROJECT_ID } from './emulator-admin';
import {
  USER, FINCA_ESPERANZA, FINCA_ROBLE, LOTE_PROPIO, LOTE_MEDIAS, SOCIO,
  PROPIO_ANIMALES, MEDIAS_ANIMALES,
} from '../tests/e2e/fixtures';

const NOW = '2026-06-02T00:00:00.000Z';
const FH = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const AH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';

async function clearAll() {
  await fetch(`http://${FH}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${AH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

function loteDesdeAnimales(
  base: { id: string; nombre: string },
  fincaId: string,
  tipoPropiedad: 'propio' | 'medias',
  animales: readonly any[],
  totalGastos: number,
  ventas: any[],
) {
  const totalInvertido = animales.reduce((s, a) => s + a.precioCompra, 0);
  const totalVentas = ventas.reduce((s, v) => s + v.totalVenta, 0);
  return {
    id: base.id, userId: USER.uid, fincaId, nombreLote: base.nombre,
    fechaCompra: '2026-01-14', tipoPropiedad,
    socio: tipoPropiedad === 'medias' ? { ...SOCIO } : null,
    totalAnimales: animales.length,
    animalesActivos: animales.filter((a) => a.estado === 'activo').length,
    animalesVendidos: animales.filter((a) => a.estado === 'vendido').length,
    animalesMuertos: animales.filter((a) => a.estado === 'muerto').length,
    totalInvertido, totalGastos, totalVentas,
    utilidadTotal: ventas.reduce((s, v) => s + v.utilidadBruta, 0),
    createdAt: NOW, updatedAt: NOW,
  };
}

function animalDoc(a: any, fincaId: string, loteId: string) {
  return {
    id: a.id, userId: USER.uid, fincaId, loteId,
    numeroArete: a.numeroArete, raza: a.raza, origen: a.origen, areteSenasa: a.areteSenasa,
    pesoInicial: a.pesoInicial, pesoActual: a.pesoActual, precioCompra: a.precioCompra,
    estado: a.estado, fechaIngreso: '2026-01-14',
    createdAt: NOW, updatedAt: NOW,
  };
}

export async function seedEmulator() {
  await clearAll();

  // Usuario de Auth con UID fijo
  await auth.createUser({ uid: USER.uid, email: USER.email, password: USER.password, displayName: USER.nombre });

  const batch = db.batch();
  // users
  batch.set(db.collection('users').doc(USER.uid), { id: USER.uid, email: USER.email, nombre: USER.nombre, createdAt: NOW });
  // fincas — createdAt distinto para que La Esperanza sea la activa por defecto (list[0])
  batch.set(db.collection('fincas').doc(FINCA_ESPERANZA.id), { id: FINCA_ESPERANZA.id, userId: USER.uid, nombre: FINCA_ESPERANZA.nombre, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: NOW });
  batch.set(db.collection('fincas').doc(FINCA_ROBLE.id), { id: FINCA_ROBLE.id, userId: USER.uid, nombre: FINCA_ROBLE.nombre, createdAt: '2026-01-02T00:00:00.000Z', updatedAt: NOW });

  // Venta del lote a-medias (vende ns-3): utilidad bruta y reparto 50/50
  const ventaMedias = {
    id: 'venta-1', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_MEDIAS.id,
    fecha: '2026-04-10',
    animales: [{ animalId: 'ns-3', numeroArete: 'NS-003', pesoFinal: 480, precioVenta: 700000, precioCompra: 420000 }],
    cantidadAnimales: 1, totalInversion: 420000, gastosProporcion: 30000,
    totalVenta: 700000, utilidadBruta: 250000, utilidadSocio: 125000, utilidadPropietario: 125000,
    createdAt: NOW,
  };

  const lotePropio = loteDesdeAnimales(LOTE_PROPIO, FINCA_ESPERANZA.id, 'propio', PROPIO_ANIMALES, 120000, []);
  const loteMedias = loteDesdeAnimales(LOTE_MEDIAS, FINCA_ESPERANZA.id, 'medias', MEDIAS_ANIMALES, 60000, [ventaMedias]);
  batch.set(db.collection('lotes').doc(lotePropio.id), lotePropio);
  batch.set(db.collection('lotes').doc(loteMedias.id), loteMedias);

  for (const a of PROPIO_ANIMALES) batch.set(db.collection('animales').doc(a.id), animalDoc(a, FINCA_ESPERANZA.id, LOTE_PROPIO.id));
  for (const a of MEDIAS_ANIMALES) batch.set(db.collection('animales').doc(a.id), animalDoc(a, FINCA_ESPERANZA.id, LOTE_MEDIAS.id));

  // Gastos
  batch.set(db.collection('gastos').doc('g-propio-1'), { id: 'g-propio-1', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_PROPIO.id, concepto: 'Sales minerales', tipo: 'alimento', monto: 120000, fecha: '2026-02-01', createdAt: NOW });
  batch.set(db.collection('gastos').doc('g-medias-1'), { id: 'g-medias-1', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_MEDIAS.id, concepto: 'Desparasitante', tipo: 'veterinario', monto: 60000, fecha: '2026-03-15', createdAt: NOW });
  // Venta
  batch.set(db.collection('ventas').doc(ventaMedias.id), ventaMedias);
  // Pesos (historial mínimo para gráficos de bp-1 propio)
  batch.set(db.collection('pesos').doc('p-1'), { id: 'p-1', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_PROPIO.id, animalId: 'bp-1', peso: 300, fecha: '2026-01-14', createdAt: NOW });
  batch.set(db.collection('pesos').doc('p-2'), { id: 'p-2', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_PROPIO.id, animalId: 'bp-1', peso: 380, fecha: '2026-03-14', createdAt: NOW });

  await batch.commit();
  console.log('✅ Emulador sembrado (2 fincas, 2 lotes, 7 animales, 2 gastos, 1 venta).');
}

// CLI
if (process.argv[1] && process.argv[1].includes('seed-emulator')) {
  seedEmulator().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
