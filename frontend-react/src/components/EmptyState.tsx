import type { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="bg-empty">
      <p className="bg-empty__message">{message}</p>
      {action ? <div className="bg-empty__action">{action}</div> : null}
    </div>
  );
}
