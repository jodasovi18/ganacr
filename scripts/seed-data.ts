import { randomUUID } from 'crypto';

// ─── Constantes exportadas para usar en los tests de Playwright ───────────────
export const LOTE3_NOMBRE = 'Lote Cebuinos Guanacaste';
export const LOTE2_NOMBRE = 'Lote Charolais Sur';
export const LOTE6_NOMBRE = 'Lote Nelore Stress';

export const LOTE3_EXPECTED = {
  totalInversion: 2_035_000,
  totalVenta: 2_855_000,
  gastosProporcion: 290_000,    // todos los animales vendidos → 100% de gastos
  utilidadBruta: 530_000,        // 2855000 - 2035000 - 290000
  utilidadSocio: 212_000,        // 530000 * 0.40
  utilidadPropietario: 318_000,  // 530000 * 0.60
  socioNombre: 'Rolando Fallas',
  socioPorcentaje: 40,
  cantidadAnimales: 7,
};

export const LOTE2_EXPECTED = {
  animalesActivos: 5,
  animalesVendidos: 3,
  totalVenta: 1_300_000,
  socioNombre: 'Tico Mora',
  socioPorcentaje: 50,
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
  const L6 = randomUUID();

  // Helper para crear animal individual
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

  type AnimalDoc = ReturnType<typeof mkAnimal>;

  // Helper para crear animales en bulk (aretes secuenciales)
  const mkBulkAnimals = (
    loteId: string,
    prefix: string,
    raza: string,
    startNum: number,
    count: number,
    basePrice: number,
    baseWeight: number,
    fechaIngreso: string,
    estado: 'activo' | 'vendido' = 'activo'
  ): AnimalDoc[] =>
    Array.from({ length: count }, (_, i) => {
      const num = startNum + i;
      const arete = `${prefix}-${String(num).padStart(3, '0')}`;
      const peso = baseWeight + (i % 60);           // variar entre 0 y +59 kg
      const precio = basePrice + (i % 20) * 5_000;  // variar en múltiplos de 5k
      return mkAnimal(loteId, arete, raza, peso, precio, fechaIngreso, estado, peso + 40);
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

  // ─── LOTE 1: Brahman Norte — propio, 120 animales activos ────────────────
  const l1AnimalesBase: AnimalDoc[] = [
    mkAnimal(L1, 'BN-001', 'Brahman', 380, 295_000, '2026-01-10', 'activo', 420),
    mkAnimal(L1, 'BN-002', 'Brahman', 350, 275_000, '2026-01-10', 'activo', 388),
    mkAnimal(L1, 'BN-003', 'Brahman', 410, 320_000, '2026-01-10', 'activo', 450),
    mkAnimal(L1, 'BN-004', 'Brahman', 395, 310_000, '2026-01-10', 'activo', 435),
    mkAnimal(L1, 'BN-005', 'Brahman', 365, 285_000, '2026-01-10', 'activo', 400),
    mkAnimal(L1, 'BN-006', 'Brahman', 390, 305_000, '2026-01-10', 'activo', 428),
    mkAnimal(L1, 'BN-007', 'Brahman', 420, 330_000, '2026-01-10', 'activo', 462),
    mkAnimal(L1, 'BN-008', 'Brahman', 370, 290_000, '2026-01-10', 'activo', 408),
  ];
  // BN-009 … BN-120 (112 animales adicionales)
  const l1AnimalesBulk = mkBulkAnimals(L1, 'BN', 'Brahman', 9, 112, 280_000, 360, '2026-01-10', 'activo');
  const l1Animals: AnimalDoc[] = [...l1AnimalesBase, ...l1AnimalesBulk];

  const l1Gastos = [
    mkGasto(L1, 'Sal mineralizada enero', 'alimento',    85_000, '2026-01-15'),
    mkGasto(L1, 'Desparasitación',         'veterinario', 45_000, '2026-01-20'),
    mkGasto(L1, 'Peón enero',              'mano_de_obra', 60_000, '2026-01-31'),
    mkGasto(L1, 'Concentrado febrero',     'alimento',   120_000, '2026-02-10'),
    mkGasto(L1, 'Transporte al potrero',   'transporte',  35_000, '2026-02-15'),
  ];

  // ─── LOTE 2: Charolais Sur — medias Tico Mora 50%, 3 vendidos ────────────
  // NOTA: No se escala — calculos.spec.ts verifica valores exactos de este lote.
  const l2Animals: AnimalDoc[] = [
    mkAnimal(L2, 'CS-001', 'Charolais', 400, 300_000, '2026-02-05', 'vendido', 520),
    mkAnimal(L2, 'CS-002', 'Charolais', 375, 280_000, '2026-02-05', 'vendido', 490),
    mkAnimal(L2, 'CS-003', 'Charolais', 385, 290_000, '2026-02-05', 'vendido', 500),
    mkAnimal(L2, 'CS-004', 'Charolais', 360, 270_000, '2026-02-05', 'activo',  395),
    mkAnimal(L2, 'CS-005', 'Charolais', 395, 300_000, '2026-02-05', 'activo',  432),
    mkAnimal(L2, 'CS-006', 'Charolais', 410, 315_000, '2026-02-05', 'activo',  448),
    mkAnimal(L2, 'CS-007', 'Charolais', 380, 285_000, '2026-02-05', 'activo',  416),
    mkAnimal(L2, 'CS-008', 'Charolais', 370, 278_000, '2026-02-05', 'activo',  405),
  ];
  const l2Gastos = [
    mkGasto(L2, 'Alimento febrero',    'alimento',    200_000, '2026-02-10'),
    mkGasto(L2, 'Veterinario general', 'veterinario',  50_000, '2026-02-20'),
    mkGasto(L2, 'Mano de obra',        'mano_de_obra', 80_000, '2026-02-28'),
    mkGasto(L2, 'Transporte a subasta','transporte',   40_000, '2026-03-05'),
  ];
  const l2GastosTotal = 370_000;
  const l2GastosProporcion = (l2GastosTotal / 8) * 3; // 138,750
  const l2TotalInversion = 870_000;
  const l2TotalVenta = 1_300_000;
  const l2UtilidadBruta = l2TotalVenta - l2TotalInversion - l2GastosProporcion;
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
    utilidadSocio: Math.round(l2UtilidadBruta * 0.5),
    utilidadPropietario: Math.round(l2UtilidadBruta * 0.5),
    createdAt: now,
    _testData: true as const,
  };

  // ─── LOTE 3: Cebuinos Guanacaste — medias Rolando 40%, TODOS VENDIDOS ─────
  // NOTA: No se cambia — calculos.spec.ts valida valores al centavo.
  const l3Animals: AnimalDoc[] = [
    mkAnimal(L3, 'CG-001', 'Cebú', 350, 280_000, '2025-09-01', 'vendido', 480),
    mkAnimal(L3, 'CG-002', 'Cebú', 320, 260_000, '2025-09-01', 'vendido', 450),
    mkAnimal(L3, 'CG-003', 'Cebú', 400, 320_000, '2025-09-01', 'vendido', 520),
    mkAnimal(L3, 'CG-004', 'Cebú', 380, 305_000, '2025-09-01', 'vendido', 500),
    mkAnimal(L3, 'CG-005', 'Cebú', 330, 265_000, '2025-09-01', 'vendido', 460),
    mkAnimal(L3, 'CG-006', 'Cebú', 360, 290_000, '2025-09-01', 'vendido', 490),
    mkAnimal(L3, 'CG-007', 'Cebú', 390, 315_000, '2025-09-01', 'vendido', 510),
  ];
  const l3Gastos = [
    mkGasto(L3, 'Sal y melaza',       'alimento',    150_000, '2025-09-15'),
    mkGasto(L3, 'Vitaminas B12',      'veterinario',  45_000, '2025-10-01'),
    mkGasto(L3, 'Peón septiembre',    'mano_de_obra', 60_000, '2025-09-30'),
    mkGasto(L3, 'Transporte subasta', 'transporte',   35_000, '2025-12-10'),
  ];
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

  // ─── LOTE 4: Criollo Zona Norte — propio, 100 animales activos ────────────
  const l4AnimalesBase: AnimalDoc[] = [
    mkAnimal(L4, 'CZN-001', 'Criollo', 300, 230_000, '2026-03-15', 'activo', 340),
    mkAnimal(L4, 'CZN-002', 'Criollo', 320, 245_000, '2026-03-15', 'activo', 360),
    mkAnimal(L4, 'CZN-003', 'Criollo', 310, 238_000, '2026-03-15', 'activo', 352),
    mkAnimal(L4, 'CZN-004', 'Criollo', 335, 258_000, '2026-03-15', 'activo', 378),
    mkAnimal(L4, 'CZN-005', 'Criollo', 290, 222_000, '2026-03-15', 'activo', 328),
    mkAnimal(L4, 'CZN-006', 'Criollo', 315, 242_000, '2026-03-15', 'activo', 356),
    mkAnimal(L4, 'CZN-007', 'Criollo', 325, 250_000, '2026-03-15', 'activo', 368),
    mkAnimal(L4, 'CZN-008', 'Criollo', 305, 234_000, '2026-03-15', 'activo', 345),
  ];
  // CZN-009 … CZN-100 (92 animales adicionales)
  const l4AnimalesBulk = mkBulkAnimals(L4, 'CZN', 'Criollo', 9, 92, 220_000, 300, '2026-03-15', 'activo');
  const l4Animals: AnimalDoc[] = [...l4AnimalesBase, ...l4AnimalesBulk];

  const l4Gastos = [
    mkGasto(L4, 'Pasto de corta',  'alimento',    95_000, '2026-03-20'),
    mkGasto(L4, 'Desparasitante',  'veterinario', 38_000, '2026-04-01'),
    mkGasto(L4, 'Jornales',        'mano_de_obra', 55_000, '2026-03-31'),
    mkGasto(L4, 'Combustible',     'transporte',  25_000, '2026-04-05'),
  ];

  // ─── LOTE 5: Pardo Suizo Turrialba — medias Carmen 60%, sin cambios ───────
  const l5Animals: AnimalDoc[] = [
    mkAnimal(L5, 'PST-001', 'Pardo Suizo', 450, 370_000, '2026-04-01', 'activo', 490),
    mkAnimal(L5, 'PST-002', 'Pardo Suizo', 480, 395_000, '2026-04-01', 'activo', 522),
    mkAnimal(L5, 'PST-003', 'Pardo Suizo', 460, 378_000, '2026-04-01', 'activo', 502),
    mkAnimal(L5, 'PST-004', 'Pardo Suizo', 440, 362_000, '2026-04-01', 'activo', 480),
    mkAnimal(L5, 'PST-005', 'Pardo Suizo', 470, 386_000, '2026-04-01', 'activo', 512),
    mkAnimal(L5, 'PST-006', 'Pardo Suizo', 455, 374_000, '2026-04-01', 'activo', 496),
    mkAnimal(L5, 'PST-007', 'Pardo Suizo', 465, 382_000, '2026-04-01', 'activo', 506),
  ];
  const l5Gastos = [
    mkGasto(L5, 'Concentrado premium',       'alimento',    350_000, '2026-04-10'),
    mkGasto(L5, 'Vacunas y tratamientos',    'veterinario', 120_000, '2026-04-15'),
    mkGasto(L5, 'Peón especializado',        'mano_de_obra', 180_000, '2026-04-30'),
    mkGasto(L5, 'Transporte especial',       'transporte',   95_000, '2026-05-01'),
    mkGasto(L5, 'Suplemento mineral',        'alimento',     85_000, '2026-05-10'),
    mkGasto(L5, 'Honorarios veterinario',    'veterinario',  75_000, '2026-05-15'),
  ];

  // ─── LOTE 6: Nelore Stress — medias Esteban Chaves 50%, venta masiva ──────
  // 10 activos (NS-001…NS-010) + 90 vendidos (NS-011…NS-100)
  // Propósito: estresar useAnularVenta con un batch de 90 animales
  const l6AnimalesActivos = mkBulkAnimals(L6, 'NS', 'Nelore', 1,   10, 290_000, 360, '2026-01-15', 'activo');
  const l6AnimalesVendidos = mkBulkAnimals(L6, 'NS', 'Nelore', 11,  90, 290_000, 360, '2026-01-15', 'vendido');
  const l6Animals: AnimalDoc[] = [...l6AnimalesActivos, ...l6AnimalesVendidos];

  const l6Gastos = [
    mkGasto(L6, 'Alimento general', 'alimento', 500_000, '2026-01-20'),
  ];

  // Venta de 90 animales — todos los vendidos de L6
  const l6VentaTotalInversion = l6AnimalesVendidos.reduce((s, a) => s + a.precioCompra, 0);
  const l6VentaTotalVenta     = l6AnimalesVendidos.length * 360_000; // 90 × 360k = 32,400,000
  const l6GastosProporcion    = 500_000;  // 100% de gastos (todos vendidos)
  const l6UtilidadBruta       = l6VentaTotalVenta - l6VentaTotalInversion - l6GastosProporcion;

  const ventaL6 = {
    id: randomUUID(),
    userId,
    loteId: L6,
    fecha: '2026-03-01',
    animales: l6AnimalesVendidos.map((a) => ({
      animalId: a.id,
      numeroArete: a.numeroArete,
      pesoFinal: a.pesoActual,
      precioVenta: 360_000,
      precioCompra: a.precioCompra,
    })),
    cantidadAnimales: l6AnimalesVendidos.length,
    totalInversion: l6VentaTotalInversion,
    gastosProporcion: l6GastosProporcion,
    totalVenta: l6VentaTotalVenta,
    utilidadBruta: l6UtilidadBruta,
    utilidadSocio: Math.round(l6UtilidadBruta * 0.5),
    utilidadPropietario: Math.round(l6UtilidadBruta * 0.5),
    createdAt: now,
    _testData: true as const,
  };

  // ─── PESAJES (3 por animal) ────────────────────────────────────────────────
  type GastoDoc = ReturnType<typeof mkGasto>;

  const generatePesajes = (animals: AnimalDoc[], baseDate: string, loteId: string) => {
    const result: object[] = [];
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
    ...generatePesajes(l1Animals,  '2026-01-10', L1),
    ...generatePesajes(l2Animals,  '2026-02-05', L2),
    ...generatePesajes(l3Animals,  '2025-09-01', L3),
    ...generatePesajes(l4Animals,  '2026-03-15', L4),
    ...generatePesajes(l5Animals,  '2026-04-01', L5),
    ...generatePesajes(l6Animals,  '2026-01-15', L6),
  ];

  // ─── LOTES con contadores calculados ──────────────────────────────────────
  const mkLote = (
    id: string,
    nombre: string,
    fechaCompra: string,
    tipo: 'propio' | 'medias',
    animals: AnimalDoc[],
    gastos: GastoDoc[],
    ventas: { totalVenta: number; utilidadBruta: number }[],
    socio?: { nombre: string; porcentaje: number }
  ) => ({
    id,
    userId,
    nombreLote: nombre,
    fechaCompra,
    tipoPropiedad: tipo,
    ...(socio && { socio }),
    totalAnimales:    animals.length,
    animalesActivos:  animals.filter(a => a.estado === 'activo').length,
    animalesVendidos: animals.filter(a => a.estado === 'vendido').length,
    animalesMuertos:  0,
    totalInvertido:   animals.reduce((s, a) => s + a.precioCompra, 0),
    totalGastos:      gastos.reduce((s, g) => s + g.monto, 0),
    totalVentas:      ventas.reduce((s, v) => s + v.totalVenta, 0),
    utilidadTotal:    ventas.reduce((s, v) => s + v.utilidadBruta, 0),
    createdAt: now,
    updatedAt: now,
    _testData: true as const,
  });

  const lotes = [
    mkLote(L1, 'Lote Brahman Norte',        '2026-01-10', 'propio', l1Animals, l1Gastos, []),
    mkLote(L2, 'Lote Charolais Sur',         '2026-02-05', 'medias', l2Animals, l2Gastos, [ventaL2], { nombre: 'Tico Mora',      porcentaje: 50 }),
    mkLote(L3, 'Lote Cebuinos Guanacaste',   '2025-09-01', 'medias', l3Animals, l3Gastos, [ventaL3], { nombre: 'Rolando Fallas', porcentaje: 40 }),
    mkLote(L4, 'Lote Criollo Zona Norte',    '2026-03-15', 'propio', l4Animals, l4Gastos, []),
    mkLote(L5, 'Lote Pardo Suizo Turrialba', '2026-04-01', 'medias', l5Animals, l5Gastos, [], { nombre: 'Carmen Vargas', porcentaje: 60 }),
    mkLote(L6, 'Lote Nelore Stress',         '2026-01-15', 'medias', l6Animals, l6Gastos, [ventaL6], { nombre: 'Esteban Chaves', porcentaje: 50 }),
  ];

  const allAnimals = [...l1Animals, ...l2Animals, ...l3Animals, ...l4Animals, ...l5Animals, ...l6Animals];
  const allGastos  = [...l1Gastos,  ...l2Gastos,  ...l3Gastos,  ...l4Gastos,  ...l5Gastos,  ...l6Gastos];
  const allVentas  = [ventaL2, ventaL3, ventaL6];

  return { lotes, animales: allAnimals, gastos: allGastos, pesajes: allPesajes, ventas: allVentas };
}
