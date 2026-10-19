import type { ApiError, Issue, IssueDraft, IssueItem, IssueStatus } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import { useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { itemRefs } from "./items";

export type Editing = {
  id: string | null;
  status: IssueStatus;
  language: Language;
  subject: string;
  intro: string;
  items: IssueItem[];
};

export type EditorPatch = Partial<Pick<Editing, "subject" | "intro" | "items">>;

const base = "/v1/newsletter/issues";

function fromIssue(issue: Issue): Editing {
  const { id, status, language, subject, intro, items } = issue;
  return { id, status, language, subject, intro, items };
}

function fromDraft(draft: IssueDraft): Editing {
  return { ...draft, id: null, status: "draft" };
}

function saveRequest(editing: Editing) {
  const body = { subject: editing.subject, intro: editing.intro, items: itemRefs(editing.items) };
  if (editing.id === null) {
    return apiRequest<Issue>("POST", base, { ...body, language: editing.language });
  }
  return apiRequest<Issue>("PATCH", `${base}/${editing.id}`, body);
}

type Answer<T> = { data: T | null; error: ApiError | null };

/** Runs one request at a time and keeps its failure for the alert above the editor. */
function useRunner() {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  const run = async <T>(work: () => Promise<Answer<T>>): Promise<T | null> => {
    setBusy(true);
    setFailure(undefined);
    const { data, error } = await work();
    setBusy(false);
    if (error !== null) setFailure(error);
    return data;
  };
  return { busy, failure, setFailure, run };
}

/** Keeps the issue being edited; every write answers with the issue as the API stored it. */
export function useIssueEditor(refresh: () => Promise<void>) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saved, setSaved] = useState(false);
  const { busy, failure, setFailure, run } = useRunner();
  const prepare = async (language: Language) => {
    const draft = await run(() =>
      apiRequest<IssueDraft>("GET", `${base}/draft?language=${language}`),
    );
    if (draft !== null) setEditing(fromDraft(draft));
  };
  const save = async (): Promise<Issue | null> => {
    if (editing === null) return null;
    setSaved(false);
    const issue = await run(() => saveRequest(editing));
    if (issue === null) return null;
    setEditing(fromIssue(issue));
    setSaved(true);
    await refresh();
    return issue;
  };
  const send = async () => {
    const stored = await save();
    if (stored === null) return;
    const issue = await run(() => apiRequest<Issue>("POST", `${base}/${stored.id}/send`));
    if (issue !== null) setEditing(fromIssue(issue));
    await refresh();
  };
  const open = (issue: Issue | null) => {
    setFailure(undefined);
    setSaved(false);
    setEditing(issue === null ? null : fromIssue(issue));
  };
  const update = (patch: EditorPatch) => {
    setSaved(false);
    setEditing((current) => (current === null ? current : { ...current, ...patch }));
  };
  return { editing, busy, failure, saved, prepare, save, send, open, update };
}
