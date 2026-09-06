import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTransferRestriction, type TransferRestriction } from "@/hooks/use-transfer-restriction";

const DEFAULT_STATUS = "Account Status";

function RestrictionBody({ restriction }: { restriction: TransferRestriction }) {
  return (
    <div className="space-y-1">
      <div className="font-bold">{restriction.statusText || DEFAULT_STATUS}</div>
      {restriction.message && <div className="font-normal">{restriction.message}</div>}
      <div className="text-xs opacity-80">
        {restriction.restoreLabel ? `Restore date: ${restriction.restoreLabel}` : "Until further notice"}
      </div>
    </div>
  );
}

/**
 * Wraps a transaction page (send / withdraw / receive). When a restriction is
 * active for the current user, the children are disabled (pointer-events
 * blocked + dimmed) and a blocking modal is shown.
 */
export function TransferRestrictionGate({ children }: { children: ReactNode }) {
  const restriction = useTransferRestriction();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (restriction) setOpen(true);
  }, [restriction]);

  return (
    <>
      {restriction && (
        <div className="mb-4 flex gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <RestrictionBody restriction={restriction} />
        </div>
      )}
      <div
        className={restriction ? "pointer-events-none opacity-60" : undefined}
        aria-disabled={!!restriction}
      >
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Transactions temporarily on hold
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground">
              {restriction ? (
                <RestrictionBody restriction={restriction} />
              ) : (
                "Your account is currently active."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
