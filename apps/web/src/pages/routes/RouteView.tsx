import type {
  ApiError,
  CheckCreateInput,
  PotholeCreateInput,
  PotholeStatus,
  RouteDetail,
} from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../components/ui";
import { Markdown } from "../../markdown";
import { CheckList, PotholeList } from "./CommunityLists";
import { Contents } from "./Contents";
import { ReportDialog, VerifyDialog } from "./dialogs";
import { RouteActions } from "./RouteActions";
import { RouteHead } from "./RouteHead";
import { StateBlock } from "./StateBlock";

export type RouteViewActions = {
  verify: (input: CheckCreateInput) => Promise<ApiError | undefined>;
  report: (input: PotholeCreateInput) => Promise<ApiError | undefined>;
  setStatus: (id: string, status: PotholeStatus) => Promise<ApiError | undefined>;
  remove: () => Promise<ApiError | undefined>;
};

export type RouteViewProps = { route: RouteDetail; now: Date; actions: RouteViewActions };

type Open = "verify" | "report" | "remove" | null;

type RailProps = RouteViewProps & { onOpen: (open: Open) => void; notice: string | null };

function Rail({ route, now, onOpen, notice }: RailProps): JSX.Element {
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
        <p role="status" class="text-success empty:hidden">
          {notice ?? ""}
        </p>
        <Contents route={route} />
      </div>
    </aside>
  );
}

/** Content first in the reading column; under 1024 px the state block sits before the checks. */
function Body(props: RouteViewProps & { onOpen: (open: Open) => void }): JSX.Element {
  const { route, now, actions, onOpen } = props;
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
        onStatus={(id, status) => void actions.setStatus(id, status)}
      />
      <StateBlock
        route={route}
        now={now}
        id="state-inline"
        class="max-w-prose border-t border-ink py-8 lg:hidden"
      />
      <CheckList route={route} />
    </div>
  );
}

type DialogsProps = {
  route: RouteDetail;
  actions: RouteViewActions;
  open: Open;
  close: () => void;
  onDone: (message: string) => void;
};

function RouteDialogs({ route, actions, open, close, onDone }: DialogsProps): JSX.Element {
  const { t } = useTranslation("routes");
  const after = (message: string) => (error: ApiError | undefined) => {
    if (error === undefined) onDone(message);
    return error;
  };
  const remove = () => {
    close();
    void actions.remove();
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
        onConfirm={remove}
        onCancel={close}
      />
    </>
  );
}

/** The detail of an itinerary: read it, then test it, verify it or report a pothole. */
export function RouteView(props: RouteViewProps): JSX.Element {
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = () => {
    setOpen(null);
  };
  return (
    <article>
      <RouteHead route={props.route} />
      <div class="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <Rail {...props} onOpen={setOpen} notice={notice} />
        <Body {...props} onOpen={setOpen} />
      </div>
      <RouteDialogs
        route={props.route}
        actions={props.actions}
        open={open}
        close={close}
        onDone={setNotice}
      />
    </article>
  );
}
