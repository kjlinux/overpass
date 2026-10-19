import { inView } from "motion";
import { animate } from "motion/mini";

const enter = { opacity: [0, 1], transform: ["translateY(12px)", "none"] };

/** Hides the sections still below the fold, then reveals each once as it scrolls in. */
export function revealSections(sections: readonly HTMLElement[]): () => void {
  const below = sections.filter(
    (section) => section.getBoundingClientRect().top > window.innerHeight,
  );
  for (const section of below) section.classList.add("reveal-pending");
  const stops = below.map((section) =>
    inView(
      section,
      () => {
        section.classList.remove("reveal-pending");
        animate(section, enter, { duration: 0.25, ease: [0.2, 0, 0, 1] });
      },
      { amount: 0.1 },
    ),
  );
  return () => {
    for (const stop of stops) stop();
    for (const section of below) section.classList.remove("reveal-pending");
  };
}
