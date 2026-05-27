# QA con Datos Ficticios — Plan de Implementación

> **Para agentes:** USA superpowers:executing-plans o superpowers:subagent-driven-development para ejecutar este plan tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para tracking.

**Goal:** Implementar un sistema híbrido de QA que pueble Firestore con 38 animales ficticios distribuidos en 5 lotes y ejecute una suite Playwright que valide flujos funcionales, cálculos financieros y experiencia de usuario.

**Architecture:** Script `seed.ts` escribe directamente en Firestore vía firebase-admin SDK marcando todos los docs con `_testData: true`. Suite Playwright en 5 archivos spec navega `localhost:5173` verificando datos, formularios y cálculos. Script `cleanup.ts` borra exactamente lo insertado.

**Tech Stack:** `firebase-admin` + `tsx` (seeding), `@playwright/test` (browser QA), `dotenv` (credenciales de ambiente)

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `package.json` | Modificar | Agregar deps + scripts seed/cleanup/test:qa |
| `.env` | Crear | TEST_USER_ID, TEST_EMAIL, TEST_PASSWORD |
| `.gitignore` | Modificar | Ignorar service-account.json y .env |
| `scripts/tsconfig.json` | Crear | TypeScript config para scripts Node.js |
| `scripts/firebase-admin.ts` | Crear | Inicializa firebase-admin SDK |
| `scripts/seed-data.ts` | Crear | Todos los datos ficticios + constantes para tests |
| `scripts/seed.ts` | Crear | Lee seed-data y escribe en Firestore |
| `scripts/cleanup.ts` | Crear | Borra docs con _testData:true |
| `playwright.config.ts` | Crear | Configuración base de Playwright |
| `tests/qa/helpers.ts` | Crear | Función de login compartida entre specs |
| `tests/qa/login.spec.ts` | Crear | Tests de autenticación |
| `tests/qa/dashboard.spec.ts` | Crear | Tests de vista general y estadísticas |
| `tests/qa/lote-detalle.spec.ts` | Crear | Tests de detalle de lote |
| `tests/qa/formularios.spec.ts` | Crear | Tests de validación de formularios |
| `tests/qa/calculos.spec.ts` | Crear | Tests de cálculos financieros al centavo |

---

## Pre-requisitos manuales (hacer ANTES de ejecutar cualquier tarea)

1. **Service Account de Firebase:**
   - Ir a [Firebase Console](https://console.firebase.google.com) → tu proyecto → Configuración del proyecto → Cuentas de servicio
   - Clic en "Generar nueva clave privada" → descargar JSON
   - Guardar como `scripts/service-account.json` (nunca subir a git)

2. **Obtener el UID del usuario de prueba:**
   - Firebase Console → Authentication → Users → copiar el UID del usuario registrado

---

## Task 1: Instalar dependencias y configurar package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar dependencias de desarrollo**

```bash
npm install --save-dev firebase-admin tsx @playwright/test dotenv
```

Resultado esperado: paquetes instalados sin errores.

- [ ] **Step 2: Instalar browsers de Playwright**

```bash
npx playwright install chromium
```

Resultado esperado: `✓ chromium ... installed`

- [ ] **Step 3: Agregar scripts a package.json**

Abrir `package.json` y agregar en la sección `"scripts"`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "seed": "tsx --tsconfig scripts/tsconfig.json scripts/seed.ts",
  "cleanup": "tsx --tsconfig scripts/tsconfig.json scripts/cleanup.ts",
  "test:qa": "playwright test"
}
```

---

## Task 2: Configurar ambiente, Firebase Admin y gitignore

**Files:**
- Create: `scripts/tsconfig.json`
- Create: `scripts/firebase-admin.ts`
- Create: `.env`
- Modify: `.gitignore`

- [ ] **Step 1: Crear tsconfig para scripts**

Crear `scripts/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "strict": false,
    "outDir": "../dist-scripts"
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 2: Crear scripts/firebase-admin.ts**

```typescript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const serviceAccountPath = resolve(process.cwd(), 'scripts/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();

export const TEST_USER_ID: string = process.env.TEST_USER_ID ?? '';

if (!TEST_USER_ID) {
  console.error('ERROR: TEST_USER_ID no está definido en .env');
  process.exit(1);
}
```

- [ ] **Step 3: Crear .env con credenciales**

Crear `.env` en la raíz del proyecto (reemplazar valores reales):

```
TEST_USER_ID=PEGAR_AQUI_EL_UID_DE_FIREBASE_AUTH
TEST_EMAIL=tu-email@ejemplo.com
TEST_PASSWORD=tu-contraseña-aqui
```

- [ ] **Step 4: Actualizar .gitignore**

Verificar que `.gitignore` contenga estas líneas (agregar si faltan):

```
scripts/service-account.json
.env
dist-scripts/
tests/qa/screenshots/
```

---

## Task 3: Crear seed-data.ts con todos los datos ficticios

**Files:**
- Create: `scripts/seed-data.ts`

- [ ] **Step 1: Crear scripts/seed-data.ts**

```typescript
import { randomUUID } from 'crypto';

// ─── Constantes de Lote 3 para validación exacta en tests ────────────────────
export const LOTE3_NOMBRE = 'Lote Cebuinos Guanacaste';
export const LOTE3_EXPECTED = {
  totalInversion: 2_035_000,
  totalVenta: 2_855_000,
  gastosProporcion: 290_000,   // todos los animales vendidos → 100% de gastos
  utilidadBruta: 530_000,       // 2855000 - 2035000 - 290000
  utilidadSocio: 212_000,       // 530000 * 0.40
  utilidadPropietario: 318_000, // 530000 * 0.60
  socioNombre: 'Rolando Fallas',
  socioPorcentaje: 40,
};

export const LOTE2_NOMBRE = 'Lote Charolais Sur';
export const LOTE2_EXPECTED = {
  animalesActivos: 5,
  animalesVendidos: 3,
  totalVenta: 1_300_000,
};

// ─── Generador principal ──────────────────────────────────────────────────────
export function generateSeedData(userId: string) {
  const now = new Date().toISOString();

  // IDs de lotes
  const L1 = randomUUID();
  const L2 = randomUUID();
  const L3 = randomUUID();
  const L4 = randomUUID();
  const L5 = randomUUID();

  // Helper para crear animal
  const mkAnimal = (
    loteId: string,
    arete: string,
    raza: string,
    pesoInicial: number,
    precioCompra: number,
    fechaIngreso: string,
    estado: 'activo' | 'vendido' = 'activo',
    pesoActual?: number
  ) => ({
    id: randomUUID(),
    userId,
    loteId,
    numeroArete: arete,
    raza,
    pesoInicial,
    pesoActual: pesoActual ?? pesoInicial,
    precioCompra,
    estado,
    fechaIngreso,
    createdAt: now,
    updatedAt: now,
    _testData: true as const,
  });

  // Helper para crear gasto
  const mkGasto = (
    loteId: string,
    concepto: string,
    tipo: string,
    monto: number,
    fecha: string
  ) => ({
    id: randomUUID(),
    userId,
    loteId,
    concepto,
    tipo,
    monto,
    fecha,
    createdAt: now,
    _testData: true as const,
  });

  // ─── LOTE 1: Brahman Norte — propio, activo ──────────────────────────────
  const l1Animals = [
    mkAnimal(L1, 'BN-001', 'Brahman', 380, 295_000, '2026-01-10', 'activo', 420),
    mkAnimal(L1, 'BN-002', 'Brahman', 350, 275_000, '2026-01-10', 'activo', 388),
    mkAnimal(L1, 'BN-003', 'Brahman', 410, 320_000, '2026-01-10', 'activo', 450),
    mkAnimal(L1, 'BN-004', 'Brahman', 395, 310_000, '2026-01-10', 'activo', 435),
    mkAnimal(L1, 'BN-005', 'Brahman', 365, 285_000, '2026-01-10', 'activo', 400),
    mkAnimal(L1, 'BN-006', 'Brahman', 390, 305_000, '2026-01-10', 'activo', 428),
    mkAnimal(L1, 'BN-007', 'Brahman', 420, 330_000, '2026-01-10', 'activo', 462),
    mkAnimal(L1, 'BN-008', 'Brahman', 370, 290_000, '2026-01-10', 'activo', 408),
  ];
  const l1Gastos = [
    mkGasto(L1, 'Sal mineralizada enero', 'alimento', 85_000, '2026-01-15'),
    mkGasto(L1, 'Desparasitación', 'veterinario', 45_000, '2026-01-20'),
    mkGasto(L1, 'Peón enero', 'mano_de_obra', 60_000, '2026-01-31'),
    mkGasto(L1, 'Concentrado febrero', 'alimento', 120_000, '2026-02-10'),
    mkGasto(L1, 'Transporte al potrero', 'transporte', 35_000, '2026-02-15'),
  ];

  // ─── LOTE 2: Charolais Sur — medias Tico Mora 50%, 3 vendidos ────────────
  const l2Animals = [
    mkAnimal(L2, 'CS-001', 'Charolais', 400, 300_000, '2026-02-05', 'vendido', 520),
    mkAnimal(L2, 'CS-002', 'Charolais', 375, 280_000, '2026-02-05', 'vendido', 490),
    mkAnimal(L2, 'CS-003', 'Charolais', 385, 290_000, '2026-02-05', 'vendido', 500),
    mkAnimal(L2, 'CS-004', 'Charolais', 360, 270_000, '2026-02-05', 'activo', 395),
    mkAnimal(L2, 'CS-005', 'Charolais', 395, 300_000, '2026-02-05', 'activo', 432),
    mkAnimal(L2, 'CS-006', 'Charolais', 410, 315_000, '2026-02-05', 'activo', 448),
    mkAnimal(L2, 'CS-007', 'Charolais', 380, 285_000, '2026-02-05', 'activo', 416),
    mkAnimal(L2, 'CS-008', 'Charolais', 370, 278_000, '2026-02-05', 'activo', 405),
  ];
  const l2Gastos = [
    mkGasto(L2, 'Alimento febrero', 'alimento', 200_000, '2026-02-10'),
    mkGasto(L2, 'Veterinario general', 'veterinario', 50_000, '2026-02-20'),
    mkGasto(L2, 'Mano de obra', 'mano_de_obra', 80_000, '2026-02-28'),
    mkGasto(L2, 'Transporte a subasta', 'transporte', 40_000, '2026-03-05'),
  ];
  // Venta parcial L2 (3 de 8 animales)
  const l2GastosTotal = 370_000;
  const l2TotalAnimalesEnLote = 8;
  const l2GastosProporcion = (l2GastosTotal / l2TotalAnimalesEnLote) * 3; // 138,750
  const l2TotalInversion = 870_000;   // 300k+280k+290k
  const l2TotalVenta = 1_300_000;     // 450k+420k+430k
  const l2UtilidadBruta = l2TotalVenta - l2TotalInversion - l2GastosProporcion; // 291,250
  const ventaL2 = {
    id: randomUUID(),
    userId,
    loteId: L2,
    fecha: '2026-04-20',
    animales: [
      { animalId: l2Animals[0].id, numeroArete: 'CS-001', pesoFinal: 520, precioVenta: 450_000, precioCompra: 300_000 },
      { animalId: l2Animals[1].id, numeroArete: 'CS-002', pesoFinal: 490, precioVenta: 420_000, precioCompra: 280_000 },
      { animalId: l2Animals[2].id, numeroArete: 'CS-003', pesoFinal: 500, precioVenta: 430_000, precioCompra: 290_000 },
    ],
    cantidadAnimales: 3,
    totalInversion: l2TotalInversion,
    gastosProporcion: l2GastosProporcion,
    totalVenta: l2TotalVenta,
    utilidadBruta: l2UtilidadBruta,
    utilidadSocio: Math.round(l2UtilidadBruta * 0.5),       // 145,625
    utilidadPropietario: Math.round(l2UtilidadBruta * 0.5), // 145,625
    createdAt: now,
    _testData: true as const,
  };

  // ─── LOTE 3: Cebuinos Guanacaste — medias Rolando 40%, TODOS VENDIDOS ─────
  const l3Animals = [
    mkAnimal(L3, 'CG-001', 'Cebú', 350, 280_000, '2025-09-01', 'vendido', 480),
    mkAnimal(L3, 'CG-002', 'Cebú', 320, 260_000, '2025-09-01', 'vendido', 450),
    mkAnimal(L3, 'CG-003', 'Cebú', 400, 320_000, '2025-09-01', 'vendido', 520),
    mkAnimal(L3, 'CG-004', 'Cebú', 380, 305_000, '2025-09-01', 'vendido', 500),
    mkAnimal(L3, 'CG-005', 'Cebú', 330, 265_000, '2025-09-01', 'vendido', 460),
    mkAnimal(L3, 'CG-006', 'Cebú', 360, 290_000, '2025-09-01', 'vendido', 490),
    mkAnimal(L3, 'CG-007', 'Cebú', 390, 315_000, '2025-09-01', 'vendido', 510),
  ];
  const l3Gastos = [
    mkGasto(L3, 'Sal y melaza', 'alimento', 150_000, '2025-09-15'),
    mkGasto(L3, 'Vitaminas B12', 'veterinario', 45_000, '2025-10-01'),
    mkGasto(L3, 'Peón septiembre', 'mano_de_obra', 60_000, '2025-09-30'),
    mkGasto(L3, 'Transporte subasta', 'transporte', 35_000, '2025-12-10'),
  ];
  // totalInversion = 280k+260k+320k+305k+265k+290k+315k = 2,035,000
  // totalVenta = 400k+375k+435k+420k+385k+410k+430k = 2,855,000
  // gastosProporcion = 290,000 (todos los animales vendidos)
  // utilidadBruta = 530,000 | socio 40% = 212,000 | prop 60% = 318,000
  const ventaL3 = {
    id: randomUUID(),
    userId,
    loteId: L3,
    fecha: '2025-12-15',
    animales: [
      { animalId: l3Animals[0].id, numeroArete: 'CG-001', pesoFinal: 480, precioVenta: 400_000, precioCompra: 280_000 },
      { animalId: l3Animals[1].id, numeroArete: 'CG-002', pesoFinal: 450, precioVenta: 375_000, precioCompra: 260_000 },
      { animalId: l3Animals[2].id, numeroArete: 'CG-003', pesoFinal: 520, precioVenta: 435_000, precioCompra: 320_000 },
      { animalId: l3Animals[3].id, numeroArete: 'CG-004', pesoFinal: 500, precioVenta: 420_000, precioCompra: 305_000 },
      { animalId: l3Animals[4].id, numeroArete: 'CG-005', pesoFinal: 460, precioVenta: 385_000, precioCompra: 265_000 },
      { animalId: l3Animals[5].id, numeroArete: 'CG-006', pesoFinal: 490, precioVenta: 410_000, precioCompra: 290_000 },
      { animalId: l3Animals[6].id, numeroArete: 'CG-007', pesoFinal: 510, precioVenta: 430_000, precioCompra: 315_000 },
    ],
    cantidadAnimales: 7,
    totalInversion: 2_035_000,
    gastosProporcion: 290_000,
    totalVenta: 2_855_000,
    utilidadBruta: 530_000,
    utilidadSocio: 212_000,
    utilidadPropietario: 318_000,
    createdAt: now,
    _testData: true as const,
  };

  // ─── LOTE 4: Criollo Zona Norte — propio, activo ──────────────────────────
  const l4Animals = [
    mkAnimal(L4, 'CZN-001', 'Criollo', 300, 230_000, '2026-03-15', 'activo', 340),
    mkAnimal(L4, 'CZN-002', 'Criollo', 320, 245_000, '2026-03-15', 'activo', 360),
    mkAnimal(L4, 'CZN-003', 'Criollo', 310, 238_000, '2026-03-15', 'activo', 352),
    mkAnimal(L4, 'CZN-004', 'Criollo', 335, 258_000, '2026-03-15', 'activo', 378),
    mkAnimal(L4, 'CZN-005', 'Criollo', 290, 222_000, '2026-03-15', 'activo', 328),
    mkAnimal(L4, 'CZN-006', 'Criollo', 315, 242_000, '2026-03-15', 'activo', 356),
    mkAnimal(L4, 'CZN-007', 'Criollo', 325, 250_000, '2026-03-15', 'activo', 368),
    mkAnimal(L4, 'CZN-008', 'Criollo', 305, 234_000, '2026-03-15', 'activo', 345),
  ];
  const l4Gastos = [
    mkGasto(L4, 'Pasto de corta', 'alimento', 95_000, '2026-03-20'),
    mkGasto(L4, 'Desparasitante', 'veterinario', 38_000, '2026-04-01'),
    mkGasto(L4, 'Jornales', 'mano_de_obra', 55_000, '2026-03-31'),
    mkGasto(L4, 'Combustible', 'transporte', 25_000, '2026-04-05'),
  ];

  // ─── LOTE 5: Pardo Suizo Turrialba — medias Carmen 60%, gastos altos ──────
  const l5Animals = [
    mkAnimal(L5, 'PST-001', 'Pardo Suizo', 450, 370_000, '2026-04-01', 'activo', 490),
    mkAnimal(L5, 'PST-002', 'Pardo Suizo', 480, 395_000, '2026-04-01', 'activo', 522),
    mkAnimal(L5, 'PST-003', 'Pardo Suizo', 460, 378_000, '2026-04-01', 'activo', 502),
    mkAnimal(L5, 'PST-004', 'Pardo Suizo', 440, 362_000, '2026-04-01', 'activo', 480),
    mkAnimal(L5, 'PST-005', 'Pardo Suizo', 470, 386_000, '2026-04-01', 'activo', 512),
    mkAnimal(L5, 'PST-006', 'Pardo Suizo', 455, 374_000, '2026-04-01', 'activo', 496),
    mkAnimal(L5, 'PST-007', 'Pardo Suizo', 465, 382_000, '2026-04-01', 'activo', 506),
  ];
  const l5Gastos = [
    mkGasto(L5, 'Concentrado premium', 'alimento', 350_000, '2026-04-10'),
    mkGasto(L5, 'Vacunas y tratamientos', 'veterinario', 120_000, '2026-04-15'),
    mkGasto(L5, 'Peón especializado', 'mano_de_obra', 180_000, '2026-04-30'),
    mkGasto(L5, 'Transporte especial', 'transporte', 95_000, '2026-05-01'),
    mkGasto(L5, 'Suplemento mineral', 'alimento', 85_000, '2026-05-10'),
    mkGasto(L5, 'Honorarios veterinario', 'veterinario', 75_000, '2026-05-15'),
  ];

  // ─── PESAJES (3 por animal) ───────────────────────────────────────────────
  const generatePesajes = (animals: ReturnType<typeof mkAnimal>[], baseDate: string, loteId: string) => {
    const result = [];
    const base = new Date(baseDate);
    for (const animal of animals) {
      for (let i = 0; i < 3; i++) {
        const fecha = new Date(base);
        fecha.setMonth(fecha.getMonth() + i + 1);
        result.push({
          id: randomUUID(),
          userId,
          animalId: animal.id,
          loteId,
          peso: animal.pesoInicial + (i + 1) * 20,
          fecha: fecha.toISOString().split('T')[0],
          createdAt: now,
          _testData: true as const,
        });
      }
    }
    return result;
  };

  const allPesajes = [
    ...generatePesajes(l1Animals, '2026-01-10', L1),
    ...generatePesajes(l2Animals, '2026-02-05', L2),
    ...generatePesajes(l3Animals, '2025-09-01', L3),
    ...generatePesajes(l4Animals, '2026-03-15', L4),
    ...generatePesajes(l5Animals, '2026-04-01', L5),
  ];

  // ─── LOTES con contadores calculados ─────────────────────────────────────
  const mkLote = (
    id: string,
    nombre: string,
    fechaCompra: string,
    tipo: 'propio' | 'medias',
    animals: ReturnType<typeof mkAnimal>[],
    gastos: ReturnType<typeof mkGasto>[],
    ventas: { totalVenta: number; utilidadBruta: number }[],
    socio?: { nombre: string; porcentaje: number }
  ) => ({
    id,
    userId,
    nombreLote: nombre,
    fechaCompra,
    tipoPropiedad: tipo,
    ...(socio && { socio }),
    totalAnimales: animals.length,
    animalesActivos: animals.filter(a => a.estado === 'activo').length,
    animalesVendidos: animals.filter(a => a.estado === 'vendido').length,
    animalesMuertos: 0,
    totalInvertido: animals.reduce((s, a) => s + a.precioCompra, 0),
    totalGastos: gastos.reduce((s, g) => s + g.monto, 0),
    totalVentas: ventas.reduce((s, v) => s + v.totalVenta, 0),
    utilidadTotal: ventas.reduce((s, v) => s + v.utilidadBruta, 0),
    createdAt: now,
    updatedAt: now,
    _testData: true as const,
  });

  const lotes = [
    mkLote(L1, 'Lote Brahman Norte',         '2026-01-10', 'propio',  l1Animals, l1Gastos, []),
    mkLote(L2, 'Lote Charolais Sur',          '2026-02-05', 'medias',  l2Animals, l2Gastos, [ventaL2], { nombre: 'Tico Mora', porcentaje: 50 }),
    mkLote(L3, 'Lote Cebuinos Guanacaste',    '2025-09-01', 'medias',  l3Animals, l3Gastos, [ventaL3], { nombre: 'Rolando Fallas', porcentaje: 40 }),
    mkLote(L4, 'Lote Criollo Zona Norte',     '2026-03-15', 'propio',  l4Animals, l4Gastos, []),
    mkLote(L5, 'Lote Pardo Suizo Turrialba',  '2026-04-01', 'medias',  l5Animals, l5Gastos, [], { nombre: 'Carmen Vargas', porcentaje: 60 }),
  ];

  const allAnimals  = [...l1Animals, ...l2Animals, ...l3Animals, ...l4Animals, ...l5Animals];
  const allGastos   = [...l1Gastos,  ...l2Gastos,  ...l3Gastos,  ...l4Gastos,  ...l5Gastos];
  const allVentas   = [ventaL2, ventaL3];

  return { lotes, animales: allAnimals, gastos: allGastos, pesajes: allPesajes, ventas: allVentas };
}
```

---

## Task 4: Crear seed.ts y ejecutarlo

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Crear scripts/seed.ts**

```typescript
import { db, TEST_USER_ID } from './firebase-admin';
import { generateSeedData } from './seed-data';

async function seed() {
  console.log(`\n🌱 Iniciando seeding para userId: ${TEST_USER_ID}\n`);
  const { lotes, animales, gastos, pesajes, ventas } = generateSeedData(TEST_USER_ID);

  const totalOps = lotes.length + animales.length + gastos.length + pesajes.length + ventas.length;
  console.log(`📦 Documentos a insertar: ${totalOps}`);
  console.log(`   - Lotes:    ${lotes.length}`);
  console.log(`   - Animales: ${animales.length}`);
  console.log(`   - Gastos:   ${gastos.length}`);
  console.log(`   - Pesajes:  ${pesajes.length}`);
  console.log(`   - Ventas:   ${ventas.length}\n`);

  // Firestore batch escribe hasta 500 ops. Dividimos en chunks si hace falta.
  const allDocs: { collection: string; id: string; data: object }[] = [
    ...lotes.map(d => ({ collection: 'lotes', id: d.id, data: d })),
    ...animales.map(d => ({ collection: 'animales', id: d.id, data: d })),
    ...gastos.map(d => ({ collection: 'gastos', id: d.id, data: d })),
    ...pesajes.map(d => ({ collection: 'pesos', id: d.id, data: d })),
    ...ventas.map(d => ({ collection: 'ventas', id: d.id, data: d })),
  ];

  const CHUNK_SIZE = 490;
  for (let i = 0; i < allDocs.length; i += CHUNK_SIZE) {
    const chunk = allDocs.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const { collection, id, data } of chunk) {
      batch.set(db.collection(collection).doc(id), data);
    }
    await batch.commit();
    console.log(`✓ Batch ${Math.floor(i / CHUNK_SIZE) + 1}: ${chunk.length} documentos escritos`);
  }

  console.log('\n✅ Seeding completado exitosamente\n');
}

seed().catch((err) => {
  console.error('❌ Error en seeding:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Ejecutar el seeding**

```bash
npm run seed
```

Resultado esperado:
```
🌱 Iniciando seeding para userId: <tu-uid>

📦 Documentos a insertar: 298
   - Lotes:    5
   - Animales: 38
   - Gastos:   23
   - Pesajes:  114
   - Ventas:   2

✓ Batch 1: 298 documentos escritos

✅ Seeding completado exitosamente
```

- [ ] **Step 3: Verificar en Firebase Console**

Ir a Firebase Console → Firestore Database → colección `lotes` → verificar que existen 5 documentos con campo `_testData: true`.

---

## Task 5: Crear cleanup.ts

**Files:**
- Create: `scripts/cleanup.ts`

- [ ] **Step 1: Crear scripts/cleanup.ts**

```typescript
import { db, TEST_USER_ID } from './firebase-admin';

const COLLECTIONS = ['lotes', 'animales', 'gastos', 'pesos', 'ventas'];

async function cleanup() {
  console.log(`\n🧹 Limpiando datos de prueba para userId: ${TEST_USER_ID}\n`);
  let totalDeleted = 0;

  for (const col of COLLECTIONS) {
    const snapshot = await db
      .collection(col)
      .where('userId', '==', TEST_USER_ID)
      .where('_testData', '==', true)
      .get();

    if (snapshot.empty) {
      console.log(`   ${col}: 0 documentos`);
      continue;
    }

    const CHUNK_SIZE = 490;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const batch = db.batch();
      docs.slice(i, i + CHUNK_SIZE).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log(`   ✓ ${col}: ${docs.length} documentos eliminados`);
    totalDeleted += docs.length;
  }

  console.log(`\n✅ Cleanup completado. Total eliminados: ${totalDeleted}\n`);
}

cleanup().catch((err) => {
  console.error('❌ Error en cleanup:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verificar que cleanup funciona (opcional — no borrar si vas a correr los tests)**

```bash
npm run cleanup
```

Resultado esperado: todos los contadores muestran los documentos eliminados. Volver a ejecutar `npm run seed` si se quiere restaurar.

---

## Task 6: Configurar Playwright y helper de login

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/qa/helpers.ts`

- [ ] **Step 1: Crear playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests/qa',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
  },
  outputDir: 'tests/qa/screenshots',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] **Step 2: Crear tests/qa/helpers.ts**

```typescript
import { Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

export const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

/**
 * Hace login en la app y espera a que el Dashboard sea visible.
 */
export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Esperar a que cargue el dashboard (título o contenedor principal)
  await page.waitForSelector('.dashboard-header, h1, [class*="dashboard"]', { timeout: 10_000 });
}
```

---

## Task 7: Tests de autenticación

**Files:**
- Create: `tests/qa/login.spec.ts`

- [ ] **Step 1: Crear tests/qa/login.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { TEST_EMAIL, TEST_PASSWORD } from './helpers';

test.describe('Autenticación', () => {
  test('login exitoso con credenciales válidas redirige al Dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // El dashboard debe aparecer
    await expect(page.locator('text=Lote Brahman Norte')).toBeVisible({ timeout: 10_000 });
  });

  test('login con contraseña incorrecta muestra mensaje de error', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill('contraseña-incorrecta-xyz-999');
    await page.locator('button[type="submit"]').click();

    // Debe mostrar algún mensaje de error
    await expect(page.locator('[class*="error"], .alert, .msg-error')).toBeVisible({ timeout: 8_000 });
    // No debe navegar fuera del login
    await expect(page).toHaveURL(/\/$/);
  });

  test('formulario no envía si email está vacío', async ({ page }) => {
    await page.goto('/');
    // Dejar email vacío, llenar contraseña
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // El campo email inválido activa la validación nativa del browser
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveJSProperty('validity.valueMissing', true);
    // La página no debe haber navegado
    await expect(page).toHaveURL(/\/$/);
  });

  test('logout limpia la sesión y regresa al login', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Lote Brahman Norte')).toBeVisible({ timeout: 10_000 });

    // Clic en el botón de logout
    await page.locator('button:has-text("Salir"), button:has-text("Cerrar"), [aria-label*="logout"], [class*="logout"]').first().click();
    // Debe regresar a la pantalla de login
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 8_000 });
  });
});
```

- [ ] **Step 2: Ejecutar solo estos tests**

```bash
npx playwright test tests/qa/login.spec.ts --headed
```

Resultado esperado: 4 tests passed.

---

## Task 8: Tests de Dashboard

**Files:**
- Create: `tests/qa/dashboard.spec.ts`

- [ ] **Step 1: Crear tests/qa/dashboard.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('muestra los 5 lotes en la lista', async ({ page }) => {
    await expect(page.locator('text=Lote Brahman Norte')).toBeVisible();
    await expect(page.locator('text=Lote Charolais Sur')).toBeVisible();
    await expect(page.locator('text=Lote Cebuinos Guanacaste')).toBeVisible();
    await expect(page.locator('text=Lote Criollo Zona Norte')).toBeVisible();
    await expect(page.locator('text=Lote Pardo Suizo Turrialba')).toBeVisible();
  });

  test('Lote 3 (todos vendidos) muestra 0 animales activos', async ({ page }) => {
    // El card del lote 3 debe reflejar que no hay animales activos
    const lote3Card = page.locator('[class*="card"], [class*="lote"]')
      .filter({ hasText: 'Lote Cebuinos Guanacaste' });
    await expect(lote3Card).toBeVisible();
    // Debe tener 0 activos o similar indicación
    await expect(lote3Card.locator('text=0').first()).toBeVisible();
  });

  test('los montos están formateados con símbolo ₡', async ({ page }) => {
    // Al menos un monto en colones debe ser visible
    await expect(page.locator('text=/₡[\\d.,]+/')).toBeVisible();
  });

  test('navegar a detalle de lote desde el dashboard', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').click();
    await expect(page).toHaveURL(/\/lote\//);
    await expect(page.locator('text=BN-001')).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Ejecutar estos tests**

```bash
npx playwright test tests/qa/dashboard.spec.ts --headed
```

Resultado esperado: 4 tests passed.

---

## Task 9: Tests de Detalle de Lote

**Files:**
- Create: `tests/qa/lote-detalle.spec.ts`

- [ ] **Step 1: Crear tests/qa/lote-detalle.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Detalle de Lote', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('Lote 1: muestra los 8 animales Brahman', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').click();
    await page.waitForSelector('text=BN-001', { timeout: 10_000 });

    for (const arete of ['BN-001', 'BN-002', 'BN-003', 'BN-004', 'BN-005', 'BN-006', 'BN-007', 'BN-008']) {
      await expect(page.locator(`text=${arete}`)).toBeVisible();
    }
  });

  test('Lote 1: muestra peso inicial y peso actual distintos', async ({ page }) => {
    await page.locator('text=Lote Brahman Norte').click();
    await page.waitForSelector('text=BN-001', { timeout: 10_000 });

    // El primer animal tiene pesoInicial 380 y pesoActual 420
    await expect(page.locator('text=380')).toBeVisible();
    await expect(page.locator('text=420')).toBeVisible();
  });

  test('Lote 2: muestra 3 animales como vendidos y 5 activos', async ({ page }) => {
    await page.locator('text=Lote Charolais Sur').click();
    await page.waitForSelector('text=CS-001', { timeout: 10_000 });

    // CS-001, CS-002, CS-003 deben mostrar estado vendido
    const vendidoBadges = page.locator('[class*="badge"], [class*="estado"]').filter({ hasText: /vendido/i });
    await expect(vendidoBadges).toHaveCount(3);
  });

  test('Lote 2: sección de gastos muestra los 4 gastos', async ({ page }) => {
    await page.locator('text=Lote Charolais Sur').click();
    await page.waitForSelector('text=CS-001', { timeout: 10_000 });

    // Navegar a pestaña de gastos
    await page.locator('text=Gastos, [class*="tab"]').filter({ hasText: /gastos/i }).first().click();
    await expect(page.locator('text=Alimento febrero')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Veterinario general')).toBeVisible();
    await expect(page.locator('text=Mano de obra')).toBeVisible();
    await expect(page.locator('text=Transporte a subasta')).toBeVisible();
  });

  test('Lote 3: sección de ventas muestra los 7 animales vendidos', async ({ page }) => {
    await page.locator('text=Lote Cebuinos Guanacaste').click();
    await page.waitForSelector('text=CG-001', { timeout: 10_000 });

    // Navegar a pestaña de ventas
    await page.locator('[class*="tab"]').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=CG-001')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=7')).toBeVisible(); // cantidadAnimales
  });
});
```

- [ ] **Step 2: Ejecutar estos tests**

```bash
npx playwright test tests/qa/lote-detalle.spec.ts --headed
```

Resultado esperado: 5 tests passed.

---

## Task 10: Tests de validación de formularios

**Files:**
- Create: `tests/qa/formularios.spec.ts`

- [ ] **Step 1: Crear tests/qa/formularios.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Validación de formularios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('crear lote sin nombre no avanza (campo required)', async ({ page }) => {
    // Abrir modal de crear lote
    await page.locator('button:has-text("Nuevo lote"), button:has-text("Crear lote"), button:has-text("+ Lote")').first().click();
    await page.waitForSelector('[class*="modal"], [class*="Modal"]', { timeout: 5_000 });

    // No llenar el nombre, intentar enviar
    await page.locator('[class*="modal"] button[type="submit"], [class*="modal"] button:has-text("Crear")').first().click();

    // El input de nombre debe quedar inválido (required)
    const nombreInput = page.locator('[class*="modal"] input').first();
    await expect(nombreInput).toHaveJSProperty('validity.valueMissing', true);

    // El modal debe seguir visible
    await expect(page.locator('[class*="modal"], [class*="Modal"]')).toBeVisible();
  });

  test('agregar animal con arete duplicado muestra error', async ({ page }) => {
    // Ir al Lote 1
    await page.locator('text=Lote Brahman Norte').click();
    await page.waitForSelector('text=BN-001', { timeout: 10_000 });

    // Abrir modal de agregar animal
    await page.locator('button:has-text("+ Agregar"), button:has-text("Agregar animal")').first().click();
    await page.waitForSelector('[class*="modal"], [class*="Modal"]', { timeout: 5_000 });

    // Usar arete que ya existe
    await page.locator('[placeholder*="arete"], [placeholder*="Arete"]').fill('BN-001');
    await page.locator('[placeholder*="raza"], [placeholder*="Raza"]').fill('Brahman');
    await page.locator('[placeholder*="peso"], input[type="number"]').first().fill('350');
    await page.locator('input[type="number"]').nth(1).fill('250000');

    await page.locator('[class*="modal"] button[type="submit"], [class*="modal"] button:has-text("Agregar")').first().click();

    // Debe mostrar error de arete duplicado
    await expect(page.locator('[class*="error"], .error-message')).toBeVisible({ timeout: 8_000 });
  });

  test('modal de venta solo muestra animales activos', async ({ page }) => {
    // Ir al Lote 2 (tiene 5 activos y 3 vendidos)
    await page.locator('text=Lote Charolais Sur').click();
    await page.waitForSelector('text=CS-004', { timeout: 10_000 });

    // Abrir modal de venta
    await page.locator('button:has-text("Vender"), button:has-text("+ Venta")').first().click();
    await page.waitForSelector('[class*="modal"], [class*="Modal"]', { timeout: 5_000 });

    // CS-001, CS-002, CS-003 son vendidos → NO deben aparecer en la lista
    await expect(page.locator('text=CS-001')).toHaveCount(0);
    await expect(page.locator('text=CS-002')).toHaveCount(0);
    await expect(page.locator('text=CS-003')).toHaveCount(0);

    // Los activos SÍ deben estar
    await expect(page.locator('text=CS-004')).toBeVisible();
    await expect(page.locator('text=CS-005')).toBeVisible();
  });
});
```

- [ ] **Step 2: Ejecutar estos tests**

```bash
npx playwright test tests/qa/formularios.spec.ts --headed
```

Resultado esperado: 3 tests passed.

---

## Task 11: Tests de cálculos financieros (Lote 3 — valores exactos)

**Files:**
- Create: `tests/qa/calculos.spec.ts`

- [ ] **Step 1: Crear tests/qa/calculos.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';
import { LOTE3_EXPECTED, LOTE3_NOMBRE } from '../../scripts/seed-data';

// Formatea número como ₡ con separadores de miles (simplificado)
function fmtColones(n: number): string {
  return `₡${n.toLocaleString('es-CR')}`;
}

test.describe('Cálculos financieros — Lote 3 (valores exactos)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.locator(`text=${LOTE3_NOMBRE}`).click();
    await page.waitForSelector('text=CG-001', { timeout: 10_000 });
  });

  test('el lote muestra 0 animales activos (todos vendidos)', async ({ page }) => {
    await expect(page.locator('text=0').first()).toBeVisible();
  });

  test('pestaña de ventas muestra la utilidad bruta correcta: ₡530.000', async ({ page }) => {
    await page.locator('[class*="tab"]').filter({ hasText: /ventas/i }).first().click();
    // Busca el monto de utilidad bruta — 530000
    await expect(page.locator('text=/530[.,]000/')).toBeVisible({ timeout: 5_000 });
  });

  test('split a medias: socio Rolando Fallas recibe ₡212.000 (40%)', async ({ page }) => {
    await page.locator('[class*="tab"]').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=/212[.,]000/')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Rolando Fallas')).toBeVisible();
  });

  test('split a medias: propietario recibe ₡318.000 (60%)', async ({ page }) => {
    await page.locator('[class*="tab"]').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=/318[.,]000/')).toBeVisible({ timeout: 5_000 });
  });

  test('totalVenta del lote coincide con ₡2.855.000', async ({ page }) => {
    // Buscar en el resumen del lote
    await expect(page.locator('text=/2[.,]855[.,]000/')).toBeVisible({ timeout: 5_000 });
  });

  test('gastos proporcionales asignados: ₡290.000 (100% al ser venta total)', async ({ page }) => {
    await page.locator('[class*="tab"]').filter({ hasText: /ventas/i }).first().click();
    await expect(page.locator('text=/290[.,]000/')).toBeVisible({ timeout: 5_000 });
  });
});
```

- [ ] **Step 2: Ejecutar estos tests**

```bash
npx playwright test tests/qa/calculos.spec.ts --headed
```

Resultado esperado: 6 tests passed.

---

## Task 12: Ejecutar suite completa y revisar reporte

- [ ] **Step 1: Correr todos los tests**

Asegurarse de que el servidor dev esté corriendo (`npm run dev`) en otra terminal, luego:

```bash
npx playwright test
```

Resultado esperado:
```
Running 22 tests using 1 worker

  ✓ login.spec.ts › login exitoso...
  ✓ login.spec.ts › login con contraseña incorrecta...
  ✓ login.spec.ts › formulario no envía si email vacío...
  ✓ login.spec.ts › logout limpia la sesión...
  ✓ dashboard.spec.ts › muestra los 5 lotes...
  ... (22 tests)

22 passed (45s)
```

- [ ] **Step 2: Ver reporte HTML si hay fallos**

```bash
npx playwright show-report
```

Abre un servidor local con el reporte detallado. Cada test fallido incluye screenshot automático.

- [ ] **Step 3: Limpiar datos de prueba cuando ya no se necesiten**

```bash
npm run cleanup
```

---

## Referencia rápida de valores Lote 3

| Concepto | Valor |
|----------|-------|
| Total inversión (7 animales) | ₡2.035.000 |
| Total venta | ₡2.855.000 |
| Gastos proporcionales | ₡290.000 |
| **Utilidad bruta** | **₡530.000** |
| Socio Rolando Fallas (40%) | ₡212.000 |
| Propietario (60%) | ₡318.000 |
