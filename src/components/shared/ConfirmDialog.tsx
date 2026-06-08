import { Modal } from './Modal'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <Modal title="Confirmar acción" onClose={onCancel}>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm}>Eliminar</button>
      </div>
    </Modal>
  )
}
