import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'

export function ExportDialog({
  open,
  message
}: {
  open: boolean
  message: string
}) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showClose={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="h-2 w-full bg-bg-tertiary rounded overflow-hidden">
            <div className="h-full w-1/3 bg-[var(--accent)] animate-pulse rounded" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
