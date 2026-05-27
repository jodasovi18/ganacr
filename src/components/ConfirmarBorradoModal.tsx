interface Props {
  titulo: string;
  descripcion?: string;
  labelConfirmar?: string;
  labelCargando?: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmarBorradoModal({
  titulo,
  descripcion,
  labelConfirmar = 'Eliminar',
  labelCargando = 'Eliminando...',
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>⚠️ {titulo}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {descripcion && (
          <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>{descripcion}</p>
        )}
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-full"
            style={{ background: 'var(--color-danger, #dc3545)', color: '#fff' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? labelCargando : labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
