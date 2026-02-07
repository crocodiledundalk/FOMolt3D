export function Emoji({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span role="img" aria-label={label}>
      {children}
    </span>
  );
}
