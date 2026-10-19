import type {
  ApiError,
  CheckCreateInput,
  PotholeCreateInput,
  PotholeStatus,
  RouteDetail,
  Service,
} from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Markdown } from "../../markdown";
import { CheckList, PotholeList } from "./CommunityLists";
import { Contents } from "./Contents";
import { CoverageSection } from "./CoverageSection";
import { ReportDialog, VerifyDialog } from "./dialogs";
import type { FlagSend } from "./FlagRoute";
import { FlagAction, HiddenNotice } from "./FlagRoute";
import { RouteActions } from "./RouteActions";
import { RouteHead } from "./RouteHead";
import { RouteQuestions } from "./RouteQuestions";
import { StateBlock } from "./StateBlock";

export type RouteViewActions = {
  verify: (input: CheckCreateInput) => Promise<ApiError | undefined>;
  report: (input: PotholeCreateInput) => Promise<ApiError | undefined>;
  setStatus: (id: string, status: PotholeStatus) => Promise<ApiError | undefined>;
  remove: () => Promise<ApiError | undefined>;
  flag?: FlagSend;
};

export type RouteViewProps = {
  route: RouteDetail;
  now: Date;
  actions: RouteViewActions;
  service?: Service | undefined;
};

type Open = "verify" | "report" | "remove" | null;
type Failure = (failure: ApiError | undefined) => void;

/** What the last action said: a success sentence or the error the API returned. */
type Outcome = { notice: string | null; failure: ApiError | undefined };

type RailProps = RouteViewProps & { onOpen: (open: Open) => void; outcome: Outcome };

function Rail({ route, now, actions, onOpen, outcome }: RailProps): JSX.Element {
  const { t } = useTranslation("routes");
  return (
    <aside
      aria-label={t("detail.actions")}
      class="border-b border-rule py-6 lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-l lg:py-8 lg:pl-8"
    >
      <div class="flex flex-col gap-6 lg:sticky lg:top-4">
        <StateBlock route={route} now={now} id="state-rail" class="hidden lg:block" />
        <RouteActions
          route={route}
          onVerify={() => {
            onOpen("verify");
          }}
          onRemove={() => {
            onOpen("remove");
          }}
        />
        {actions.flag === undefined ? null : <FlagAction route={route} onSend={actions.flag} />}
        <p role="status" class="text-success empty:hidden">
          {outcome.notice ?? ""}
        </p>
        <FormAlert error={outcome.failure} />
        <Contents route={route} />
      </div>
    </aside>
  );
}

/** Content first in the reading column; under 1024 px the state block sits before the checks. */
type BodyProps = RouteViewProps & { onOpen: (open: Open) => void; onFailure: Failure };

function Body(props: BodyProps): JSX.Element {
  const { route, now, actions, onOpen, onFailure } = props;
  const [busyId, setBusyId] = useState<string | null>(null);
  const setStatus = async (id: string, status: PotholeStatus) => {
    if (busyId !== null) return;
    setBusyId(id);
    onFailure(await actions.setStatus(id, status));
    setBusyId(null);
  };
  return (
    <div class="min-w-0 lg:col-start-1 lg:row-start-1 lg:pr-12">
      <div class="max-w-prose py-8">
        <Markdown source={route.content} />
      </div>
      <PotholeList
        route={route}
        onReport={() => {
          onOpen("report");
        }}
        busyId={busyId}
        onStatus={(id, status) => void setStatus(id, status)}
      />
      <StateBlock
        route={route}
        now={now}
        id="state-inline"
        class="max-w-prose border-t border-ink py-8 lg:hidden"
      />
      <CheckList route={route} />
      <RouteQuestions routeId={route.id} />
      {props.service === undefined ? null : <CoverageSection service={props.service} />}
    </div>
  );
}

type DialogsProps = {
  route: RouteDetail;
  actions: RouteViewActions;
  open: Open;
  close: () => void;
  onDone: (message: string) => void;
  onFailure: Failure;
};

function RouteDialogs(props: DialogsProps): JSX.Element {
  const { route, actions, open, close, onDone, onFailure } = props;
  const { t } = useTranslation("routes");
  const after = (message: string) => (error: ApiError | undefined) => {
    if (error === undefined) onDone(message);
    return error;
  };
  const remove = async () => {
    close();
    onFailure(await actions.remove());
  };
  return (
    <>
      <VerifyDialog
        open={open === "verify"}
        country={route.country}
        onClose={close}
        onSend={async (input) => after(t("detail.verified"))(await actions.verify(input))}
      />
      <ReportDialog
        open={open === "report"}
        onClose={close}
        onSend={async (input) => after(t("potholes.reported"))(await actions.report(input))}
      />
      <ConfirmDialog
        open={open === "remove"}
        title={t("detail.removeTitle")}
        description={t("detail.removeText")}
        confirmLabel={t("detail.remove")}
        destructive
        onConfirm={() => void remove()}
        onCancel={close}
      />
    </>
  );
}

/** The detail of an itinerary: read it, then test it, verify it or report a pothole. */
export function RouteView(props: RouteViewProps): JSX.Element {
  const [open, setOpen] = useState<Open>(null);
  const [outcome, setOutcome] = useState<Outcome>({ notice: null, failure: undefined });
  const close = () => {
    setOpen(null);
  };
  const onDone = (notice: string) => {
    setOutcome({ notice, failure: undefined });
  };
  const onFailure: Failure = (failure) => {
    setOutcome({ notice: null, failure });
  };
  return (
    <article>
      <RouteHead route={props.route} />
      <HiddenNotice route={props.route} />
      <div class="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <Rail {...props} onOpen={setOpen} outcome={outcome} />
        <Body {...props} onOpen={setOpen} onFailure={onFailure} />
      </div>
      <RouteDialogs
        route={props.route}
        actions={props.actions}
        open={open}
        close={close}
        onDone={onDone}
        onFailure={onFailure}
      />
    </article>
  );
}
