import { formatColones, formatFecha } from '@/utils/calculadora';
import { GastoFinca } from '@/types';

interface Props {
  gastosFinca: GastoFinca[];
  loading: boolean;
  onNuevo: () => void;
  onEliminar: (gf: GastoFinca) => void;
  deletingId: string | null;
}

export default function GastosFincaTab({
  gastosFinca,
  loading,
  onNuevo,
  onEliminar,
  deletingId,
}: Props) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Cargando gastos de finca...</span>
      </div>
    );
  }

  return (
    <div className="gastos-finca-tab">
      <div className="gastos-finca-tab-header">
        <button className="btn btn-primary btn-sm" onClick={onNuevo}>
          + Nuevo gasto
        </button>
      </div>

      {gastosFinca.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">💸</div>
          <h3>Sin gastos de finca registrados</h3>
          <p>Registrá gastos que aplican a múltiples lotes, como vacunaciones masivas o desparasitaciones.</p>
          <button className="btn btn-primary" onClick={onNuevo}>+ Registrar primer gasto</button>
        </div>
      ) : (
        <div className="gastos-finca-list">
          {gastosFinca.map((gf) => (
            <div key={gf.id} className="gasto-finca-card">
              <div className="gasto-finca-card-body">
                <div className="gasto-finca-card-top">
                  <strong className="gasto-finca-concepto">{gf.concepto}</strong>
                  <span className="badge badge-gray">{gf.tipo.replace('_', ' ')}</span>
                </div>
                <div className="gasto-finca-card-meta">
                  <span>{formatFecha(gf.fecha)}</span>
                  <span>·</span>
                  <span>
                    {gf.lotesAplicados.length} lote{gf.lotesAplicados.length !== 1 ? 's' : ''}
                  </span>
                  {gf.quienPago && (
                    <>
                      <span>·</span>
                      <span>{gf.quienPago}</span>
                    </>
                  )}
                </div>
                <div className="gasto-finca-lotes-chips">
                  {gf.lotesAplicados.map((la) => (
                    <span key={la.loteId} className="gasto-finca-lote-chip">
                      {la.nombreLote}: {formatColones(la.monto)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="gasto-finca-card-side">
                <strong className="gasto-finca-total">{formatColones(gf.montoTotal)}</strong>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Eliminar gasto de finca"
                  onClick={() => onEliminar(gf)}
                  disabled={deletingId === gf.id}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
