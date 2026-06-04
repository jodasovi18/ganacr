export interface SimulacionVenta {
  dias: number;
  pesoFuturo: number;
  ingresoHoy: number;
  ingresoFuturo: number;
  costoMantener: number;
  gananciaEsperar: number;       // (ingresoFuturo − costoMantener) − ingresoHoy
  valorMarginalDiario: number;   // gananciaDiariaKgDia × precioKg − costoDiario
  convieneEsperar: boolean;
}

export function simularVenta(
  pesoActivos: number, gananciaDiariaKgDia: number, precioKg: number,
  costoDiario: number, dias: number,
): SimulacionVenta {
  const pesoFuturo = pesoActivos + gananciaDiariaKgDia * dias;
  const ingresoHoy = pesoActivos * precioKg;
  const ingresoFuturo = pesoFuturo * precioKg;
  const costoMantener = costoDiario * dias;
  const gananciaEsperar = (ingresoFuturo - costoMantener) - ingresoHoy;
  const valorMarginalDiario = gananciaDiariaKgDia * precioKg - costoDiario;
  return {
    dias, pesoFuturo, ingresoHoy, ingresoFuturo, costoMantener,
    gananciaEsperar, valorMarginalDiario, convieneEsperar: valorMarginalDiario > 0,
  };
}
