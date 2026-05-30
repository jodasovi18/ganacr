import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? labelCargando : labelConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
