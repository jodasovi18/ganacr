// tests/e2e/fixtures.ts — constantes compartidas entre el seed y los specs.
export const USER = {
  uid: 'e2e-user',
  email: 'e2e@ganacr.test',
  password: 'e2e-pass-123',
  nombre: 'Tester E2E',
} as const;

export const FINCA_ESPERANZA = { id: 'finca-esperanza', nombre: 'La Esperanza' } as const;
export const FINCA_ROBLE = { id: 'finca-roble', nombre: 'El Roble' } as const;

export const LOTE_PROPIO = { id: 'lote-propio', nombre: 'Brahman Propio' } as const;
export const LOTE_MEDIAS = { id: 'lote-medias', nombre: 'Nelore Socio' } as const;
export const SOCIO = { nombre: 'Esteban Chaves', porcentaje: 50 } as const;

// Animales del lote propio (La Esperanza). 1 con arete, 2 sin → alerta "2 sin arete".
export const PROPIO_ANIMALES = [
  { id: 'bp-1', numeroArete: 'BP-001', raza: 'Brahman',   origen: 'comprado',     areteSenasa: 'CR-DIIO-001', pesoInicial: 300, pesoActual: 380, precioCompra: 400000, estado: 'activo' },
  { id: 'bp-2', numeroArete: 'BP-002', raza: 'Brahman',   origen: 'nacido_finca', areteSenasa: '',            pesoInicial: 250, pesoActual: 340, precioCompra: 350000, estado: 'activo' },
  { id: 'bp-3', numeroArete: 'BP-003', raza: 'Charolais', origen: 'sin_registro', areteSenasa: '',            pesoInicial: 280, pesoActual: 360, precioCompra: 300000, estado: 'activo' },
] as const;

// Animales del lote a-medias (El Roble). 1 activo c/arete, 1 activo s/arete, 1 vendido, 1 muerto.
export const MEDIAS_ANIMALES = [
  { id: 'ns-1', numeroArete: 'NS-001', raza: 'Nelore', origen: 'comprado', areteSenasa: 'CR-DIIO-101', pesoInicial: 320, pesoActual: 410, precioCompra: 450000, estado: 'activo' },
  { id: 'ns-2', numeroArete: 'NS-002', raza: 'Nelore', origen: 'comprado', areteSenasa: '',            pesoInicial: 300, pesoActual: 395, precioCompra: 430000, estado: 'activo' },
  { id: 'ns-3', numeroArete: 'NS-003', raza: 'Nelore', origen: 'comprado', areteSenasa: 'CR-DIIO-103', pesoInicial: 310, pesoActual: 480, precioCompra: 420000, estado: 'vendido' },
  { id: 'ns-4', numeroArete: 'NS-004', raza: 'Nelore', origen: 'comprado', areteSenasa: 'CR-DIIO-104', pesoInicial: 305, pesoActual: 300, precioCompra: 440000, estado: 'muerto' },
] as const;
