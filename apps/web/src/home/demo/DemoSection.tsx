import type { Language } from "@overpass/shared";
import type { FunctionComponent, JSX, RefObject } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../components/ui";
import { onIdle, onNearView } from "../hooks/idle";
import { SectionHead, sectionClass } from "../SectionHead";

type Run = FunctionComponent<{ language: Language }>;
type Props = { language: Language; focusRequest: number };

let loading: Promise<Run> | undefined;
const loadRun = (): Promise<Run> =>
  (loading ??= import("./DemoRun").then((module) => module.DemoRun));

/** Focuses the run button once it exists, else the section itself so the keyboard lands here. */
function focusDemo(section: HTMLElement | null): void {
  const button = section?.querySelector<HTMLElement>("[data-demo-run]");
  (button ?? section)?.focus({ preventScroll: true });
}

/** Loads the interactive demo near the viewport, or at once when the reader asks for it. */
function useRun(section: RefObject<HTMLElement | null>, focusRequest: number): Run | null {
  const [Run, setRun] = useState<Run | null>(null);
  useEffect(() => {
    const element = section.current;
    if (element === null) return undefined;
    let stopView = (): void => undefined;
    const show = (): void => {
      void loadRun().then((component) => {
        setRun(() => component);
      });
    };
    const stopIdle = onIdle(() => {
      stopView = onNearView(element, show, "400px");
    });
    return () => {
      stopIdle();
      stopView();
    };
  }, [section]);
  useEffect(() => {
    if (focusRequest === 0) return;
    focusDemo(section.current);
    void loadRun().then((component) => {
      setRun(() => component);
      requestAnimationFrame(() => {
        focusDemo(section.current);
      });
    });
  }, [focusRequest, section]);
  return Run;
}

/** The demo section; its interactive part loads on demand, near the viewport or on request. */
export function DemoSection({ language, focusRequest }: Props): JSX.Element {
  const { t } = useTranslation();
  const section = useRef<HTMLElement>(null);
  const Run = useRun(section, focusRequest);
  return (
    <section
      ref={section}
      id="demo"
      tabIndex={-1}
      aria-labelledby="demo-title"
      class={sectionClass}
    >
      <SectionHead id="demo-title" title={t("demo.title")} intro={t("demo.intro")} />
      {Run === null ? (
        <div class="border-t border-rule py-5">
          <Skeleton lines={3} />
        </div>
      ) : (
        <Run language={language} />
      )}
    </section>
  );
}
