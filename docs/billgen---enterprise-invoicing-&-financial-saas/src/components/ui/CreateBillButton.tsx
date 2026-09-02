import { useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { PlusIcon } from './icons/PlusIcon';

export interface CreateBillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {}

export function CreateBillButton({ className, onClick, ...rest }: CreateBillButtonProps) {
  const [shining, setShining] = useState(false);

  return (
    <button
      type="button"
      className={['bg-create-bill', shining ? 'is-shining' : '', className].filter(Boolean).join(' ')}
      aria-label="Créer une nouvelle facture"
      title="Créer une nouvelle facture"
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
