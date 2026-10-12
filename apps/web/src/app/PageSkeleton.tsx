import { Skeleton } from "../components/ui";

/** Neutral placeholder shown while a page chunk loads. */
export function PageSkeleton() {
  return (
    <div class="mx-auto max-w-frame px-4 py-24 md:px-6 lg:px-8">
      <Skeleton />
    </div>
  );
}
