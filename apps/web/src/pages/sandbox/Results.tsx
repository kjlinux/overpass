import type { SandboxProvider, Scenario } from "@overpass/shared";
import type { JSX } from "preact";
import { Deliveries } from "./Deliveries";
import { GuidedDemo } from "./GuidedDemo";
import { Inspector } from "./Inspector";
import { LaunchBar } from "./LaunchBar";
import type { useTrack } from "./useTrack";

type Track = ReturnType<typeof useTrack>;

/** The right column: launch, the guided walkthrough, the inspector and the deliveries. */
export function Results(props: {
  provider: SandboxProvider;
  track: Track;
  scenario: Scenario;
}): JSX.Element {
  const { provider, track, scenario } = props;
  return (
    <div class="pt-6 lg:pl-8">
      <LaunchBar
        provider={provider}
        scenario={scenario}
        item={track.current}
        busy={track.busy === "run"}
        onRun={() => void track.actions.run(scenario)}
      />
      {track.current === undefined ? null : (
        <GuidedDemo
          provider={provider}
          item={track.current}
          secret={track.fresh?.key}
          origin={location.origin}
          onPlay={(step, vars) => track.actions.step(step, vars, scenario)}
        />
      )}
      <Inspector event={track.event} justRan={track.justRan} />
      <Deliveries event={track.event} onReplay={(id) => void track.actions.replay(id)} />
    </div>
  );
}
