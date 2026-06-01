import type { Animal } from '@/types';

export type EstadoAnimal = 'activo' | 'vendido' | 'muerto';
export type OrigenAnimal = 'comprado' | 'nacido_finca' | 'sin_registro';

export interface FiltroAnimales {
  estados: EstadoAnimal[];          // [] = todos
  raza: string;                     // '' = todas
  origen: '' | OrigenAnimal;        // '' = todos
  pesoMin: number | null;
  pesoMax: number | null;
  gananciaMin: number | null;
  gananciaMax: number | null;
  sinAreteSenasa: boolean;          // true = solo animales sin areteSenasa
}

export const FILTRO_VACIO: FiltroAnimales = {
  estados: [],
  raza: '',
  origen: '',
  pesoMin: null,
  pesoMax: null,
  gananciaMin: null,
  gananciaMax: null,
  sinAreteSenasa: false,
};

export function filtrarAnimales(animales: Animal[], f: FiltroAnimales): Animal[] {
  return animales.filter((a) => {
    if (f.estados.length > 0 && !f.estados.includes(a.estado)) return false;
    if (f.raza && a.raza !== f.raza) return false;
    if (f.origen && (a.origen ?? 'comprado') !== f.origen) return false;
    if (f.pesoMin != null && a.pesoActual < f.pesoMin) return false;
    if (f.pesoMax != null && a.pesoActual > f.pesoMax) return false;
    const ganancia = a.pesoActual - a.pesoInicial;
    if (f.gananciaMin != null && ganancia < f.gananciaMin) return false;
    if (f.gananciaMax != null && ganancia > f.gananciaMax) return false;
    if (f.sinAreteSenasa && a.areteSenasa) return false;
    return true;
  });
}

export function contarFiltrosActivos(f: FiltroAnimales): number {
  let n = 0;
  if (f.estados.length > 0) n++;
  if (f.raza) n++;
  if (f.origen) n++;
  if (f.pesoMin != null || f.pesoMax != null) n++;
  if (f.gananciaMin != null || f.gananciaMax != null) n++;
  if (f.sinAreteSenasa) n++;
  return n;
}
