// ─── Tipos principales de GanaCR ───────────────────────────────────────────

export type TipoPropiedad = 'propio' | 'medias';

export type TipoGasto =
  | 'alimento'
  | 'veterinario'
  | 'mano_de_obra'
  | 'transporte'
  | 'otro';

export interface Socio {
  nombre: string;
  porcentaje: number; // 0-100
}

export interface Lote {
  id: string;
  userId: string;
  nombreLote: string;
  fechaCompra: string; // ISO date string
  tipoPropiedad: TipoPropiedad;
  socio?: Socio | null;
  totalAnimales: number;
  animalesActivos: number;
  animalesVendidos: number;
  animalesMuertos: number;
  totalInvertido: number;   // suma de precioCompra de todos los animales
  totalGastos: number;      // suma de todos los gastos del lote
  totalVentas: number;      // suma de ingresos por ventas
  utilidadTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Animal {
  id: string;
  userId: string;
  loteId: string;
  numeroArete: string;        // único por usuario
  raza: string;
  numeroSubasta?: string;
  pesoInicial: number;        // kg
  pesoActual: number;         // kg (se actualiza con cada pesaje)
  precioCompra: number;       // ₡
  estado: 'activo' | 'vendido' | 'muerto';
  fechaIngreso: string;
  fechaSalida?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Peso {
  id: string;
  userId: string;
  animalId: string;
  loteId: string;
  peso: number;               // kg
  fecha: string;
  notas?: string;
  createdAt: string;
}

export interface Gasto {
  id: string;
  userId: string;
  loteId: string;
  concepto: string;
  tipo: TipoGasto;
  monto: number;              // ₡
  fecha: string;
  quienPago?: string;
  notas?: string;
  createdAt: string;
}

export interface ItemVenta {
  animalId: string;
  numeroArete: string;
  pesoFinal: number;
  precioVenta: number;        // ₡ total por este animal
  precioCompra: number;       // referencia para calcular utilidad
}

export interface Venta {
  id: string;
  userId: string;
  loteId: string;
  fecha: string;
  animales: ItemVenta[];
  cantidadAnimales: number;
  totalInversion: number;
  gastosProporcion: number;
  totalVenta: number;
  utilidadBruta: number;
  utilidadSocio?: number;     // si es a medias
  utilidadPropietario?: number;
  notas?: string;
  createdAt: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  nombreFinca?: string;
  createdAt: string;
}

// ─── Resultados de cálculos ─────────────────────────────────────────────────

export interface ResultadoVenta {
  totalInversion: number;
  gastosProporcion: number;
  totalVenta: number;
  utilidadBruta: number;
  utilidadSocio?: number;
  utilidadPropietario?: number;
}
