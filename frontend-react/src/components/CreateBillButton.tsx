import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { PlusIcon } from "./icons/PlusIcon";

export interface CreateBillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {}

/** The "+" primary CTA — grows on hover, shines on click. */
export function CreateBillButton({ className, onClick, ...rest }: CreateBillButtonProps) {
  const [shining, setShining] = useState(false);

  return (
    <button
      type="button"
      className={["bg-create-bill", shining ? "is-shining" : "", className].filter(Boolean).join(" ")}
      aria-label="Create new bill"
      onClick={(event) => {
        setShining(true);
        onClick?.(event);
      }}
      onAnimationEnd={() => setShining(false)}
      {...rest}
    >
      <PlusIcon />
    </button>
  );
}
