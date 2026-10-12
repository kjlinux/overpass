/** Neutral placeholder shown while a page chunk loads. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-prose px-4 py-24">
      <div className="h-8 w-40 rounded bg-neutral-200 motion-safe:animate-pulse" />
      <div className="mt-4 h-4 w-72 rounded bg-neutral-200 motion-safe:animate-pulse" />
    </div>
  );
}
