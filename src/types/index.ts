// ─── Tipos principales de GanaCR ───────────────────────────────────────────

export type TipoPropiedad = 'propio' | 'medias';

export type TipoGasto =
  | 'alimento'
  | 'veterinario'
  | 'mano_de_obra'
  | 'transporte'
  | 'otro';

export type TipoEventoSanitario =
  | 'vacuna'
  | 'tratamiento'
  | 'desparasitante'
  | 'vitamina'
  | 'otro';

export interface EventoSanitario {
  id: string;
  userId: string;
  fincaId: string;
  loteId: string;
  animalId?: string;       // undefined = aplica al lote completo
  nombreProducto: string;
  tipo: TipoEventoSanitario;
  fecha: string;           // ISO date
  dosis?: string;
  costo: number;           // ₡ total del evento
  quienAplico?: string;
  proximaDosis?: string;   // ISO date
  notas?: string;
  gastoId: string;         // referencia al Gasto auto-creado
  createdAt: string;
}

export interface Socio {
  nombre: string;
  porcentaje: number; // 0-100
}

export interface Finca {
  id: string;
  userId: string;
  nombre: string;
  pesoUmbralAmarillo?: number; // days without weighing → 🟡 (default 15)
  pesoUmbralRojo?: number;     // days without weighing → 🔴 (default 30)
  createdAt: string;
  updatedAt: string;
}

export interface Lote {
  id: string;
  userId: string;
  fincaId: string;
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
  fincaId: string;
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
  causaMuerte?: string;          // motivo de la muerte (opcional)
  documentoVeterinario?: string; // referencia al dictamen veterinario (opcional)
  valorPerdida?: number;         // ₡ valor actual estimado registrado como pérdida al morir
  createdAt: string;
  updatedAt: string;
}

export interface Peso {
  id: string;
  userId: string;
  fincaId: string;
  animalId: string;
  loteId: string;
  peso: number;               // kg
  fecha: string;
  notas?: string;
  importado?: boolean;        // true si fue migrado desde otra finca
  createdAt: string;
}

export interface Gasto {
  id: string;
  userId: string;
  fincaId: string;
  loteId: string;
  concepto: string;
  tipo: TipoGasto;
  monto: number;              // ₡
  fecha: string;
  quienPago?: string;
  notas?: string;
  gastoFincaId?: string;      // si existe → vino de distribución de finca
  eventoSanitarioId?: string;  // si existe → vino de un evento sanitario
  createdAt: string;
}

export interface LoteAplicado {
  loteId: string;
  nombreLote: string;
  animalesActivos: number;    // snapshot al momento de creación
  monto: number;              // fracción asignada
}

export interface GastoFinca {
  id: string;
  userId: string;
  fincaId: string;
  concepto: string;
  tipo: TipoGasto;
  montoTotal: number;         // ₡ total original sin distribuir
  fecha: string;
  quienPago?: string;
  notas?: string;
  lotesAplicados: LoteAplicado[];
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
  fincaId: string;
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
  nombreFinca?: string;       // legacy — replaced by Finca collection
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
