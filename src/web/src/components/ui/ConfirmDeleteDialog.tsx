import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDeleteDialogProps {
  open: boolean
  candidateName?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeleteDialog({ open, candidateName, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="mb-2 text-lg font-semibold text-foreground">
            Delete session?
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-sm text-muted-foreground">
            This will permanently remove{' '}
            <strong className="text-foreground">{candidateName || 'this session'}</strong>.
          </Dialog.Description>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
