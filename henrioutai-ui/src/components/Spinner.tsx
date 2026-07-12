export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="bg-spinner">
      <span className="bg-spinner__icon" aria-hidden="true" />
      <span className="bg-spinner__label">{label}</span>
    </div>
  );
}
