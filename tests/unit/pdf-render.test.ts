import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import * as RP from '@react-pdf/renderer';
import ReporteSocioPDF from '../../src/components/pdf/ReporteSocioPDF';
import ReporteLotePDF from '../../src/components/pdf/ReporteLotePDF';

const lote: any = {
  id: 'L1', nombreLote: 'Nelore Socio', fechaCompra: '2026-01-14',
  tipoPropiedad: 'medias', socio: { nombre: 'Esteban Chaves', porcentaje: 50 },
  utilidadTotal: 250000, totalInvertido: 1740000, totalGastos: 60000, totalVentas: 700000,
};
const animales: any[] = [{ id: 'a1', estado: 'activo', numeroArete: 'NS-001', raza: 'Nelore', pesoInicial: 320, pesoActual: 410 }];
const ventas: any[] = [{ id: 'v1', fecha: '2026-04-10', cantidadAnimales: 1, totalVenta: 700000, utilidadBruta: 250000, utilidadSocio: 125000 }];
const gastos: any[] = [{ id: 'g1', fecha: '2026-03-15', concepto: 'Desparasitante', tipo: 'veterinario', monto: 60000 }];

async function render(el: any): Promise<Buffer> {
  return typeof (RP as any).renderToBuffer === 'function'
    ? await (RP as any).renderToBuffer(el)
    : await (RP as any).pdf(el).toBuffer();
}

test('ReporteSocioPDF renderiza un PDF válido (sin fuente remota)', async () => {
  const buf = await render(createElement(ReporteSocioPDF as any, {
    lote, animales, ventas, gastos, nombreFinca: 'El Roble', nombreDueno: 'Tester', fechaGenerado: '2026-06-02',
  }));
  assert.equal(buf.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(buf.length > 1000);
});

test('ReporteLotePDF renderiza un PDF válido', async () => {
  const buf = await render(createElement(ReporteLotePDF as any, {
    lote, animales, ventas, gastos, nombreFinca: 'El Roble', fechaGenerado: '2026-06-02',
  }));
  assert.equal(buf.subarray(0, 5).toString('latin1'), '%PDF-');
});
