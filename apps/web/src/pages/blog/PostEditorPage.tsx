import { errorMessage, languageNames, postKinds, supportedLanguages } from "@overpass/shared";
import type { Language, Me, PostDetail, PostStatus } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { RequireSession, apiRequest } from "../../session";
import { useApi } from "../routes";
import { PostForm } from "./PostForm";
import { toInstant, toLocalInput } from "./postValues";
import type { PostFormValues } from "./postValues";

const otherLanguage = (language: Language): Language =>
  supportedLanguages.find((code) => code !== language) ?? language;

/** Saving opens the post, where the author sees it exactly as readers will. */
function useSave(existing: PostDetail | null, translationOf: string | null) {
  const { route } = useLocation();
  return async (values: PostFormValues, status: PostStatus) => {
    const { publishAt, kind, language, ...fields } = values;
    const when = toInstant(publishAt);
    const result =
      existing === null
        ? await apiRequest<PostDetail>("POST", "/v1/posts", {
            ...fields,
            kind,
            language,
            status,
            ...(when === undefined ? {} : { publishAt: when }),
            ...(translationOf === null ? {} : { translationOf }),
          })
        : await apiRequest<PostDetail>("PATCH", `/v1/posts/${existing.id}`, {
            ...fields,
            status,
            publishAt: when ?? null,
          });
    if (result.error !== null) return result.error;
    route(localizedPath(result.data.language, `/blog/${result.data.slug}`));
    return undefined;
  };
}

function TranslateLink({ post }: { post: PostDetail }): JSX.Element | null {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  if (post.translation !== null) return null;
  const target = otherLanguage(post.language);
  const href = `${localizedPath(language, "/blog/write")}?translationOf=${post.id}&language=${target}&kind=${post.kind}`;
  return (
    <ButtonLink href={href}>
      {t("editor.translate", { language: languageNames[target] })}
    </ButtonLink>
  );
}

function Editor({ me, post }: { me: Me; post: PostDetail | null }): JSX.Element {
  const { t } = useTranslation("blog");
  const { query } = useLocation();
  const translationOf = post === null ? (query["translationOf"] ?? null) : null;
  const asked = supportedLanguages.find((code) => code === query["language"]);
  const kind = postKinds.find((code) => code === query["kind"]);
  const save = useSave(post, translationOf);
  const initial =
    post === null
      ? {
          ...(asked === undefined ? {} : { language: asked }),
          ...(kind === undefined ? {} : { kind }),
        }
      : { ...post, publishAt: toLocalInput(post.publishedAt) };
  const title =
    post !== null
      ? t("editor.editTitle")
      : asked !== undefined && translationOf !== null
        ? t("editor.translateTitle", { language: languageNames[asked] })
        : t("editor.newTitle");
  return (
    <section class="py-12 md:py-16">
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <h1 class="text-h1 font-semibold">{title}</h1>
        {post === null ? null : <TranslateLink post={post} />}
      </div>
      <div class="mt-8">
        <PostForm
          isAdmin={me.role === "admin"}
          initial={initial}
          locked={post !== null || translationOf !== null}
          published={post?.status === "published"}
          onSave={save}
        />
      </div>
    </section>
  );
}

function Existing({ me, id }: { me: Me; id: string }): JSX.Element {
  const language = useLanguage();
  const { state } = useApi<PostDetail>(`/v1/me/posts/${id}`);
  if (state.status === "error") return <FormAlert error={state.error} />;
  if (state.status === "notFound") {
    const missing = { code: "not_found", message: errorMessage("not_found", language) };
    return <FormAlert error={missing} />;
  }
  if (state.status !== "ready") return <Skeleton lines={8} />;
  return <Editor me={me} post={state.data} />;
}

/** New post, translation of a post, or edition of one of the member's posts. */
export function PostEditorPage(): JSX.Element {
  const language = useLanguage();
  const { params } = useRoute();
  const id = params["id"];
  return (
    <Layout language={language}>
      <RequireSession>
        {(me) => (id === undefined ? <Editor me={me} post={null} /> : <Existing me={me} id={id} />)}
      </RequireSession>
    </Layout>
  );
}
