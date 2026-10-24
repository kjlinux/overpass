import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { ZodType } from "zod";
import { storableImage } from "../modules/media/index.js";
import { parseFrontmatter } from "./frontmatter.js";
import { postSeedSchema, routeSeedSchema, threadSeedSchema } from "./schemas.js";
import type { PostSeed, RouteSeed, ThreadSeed } from "./schemas.js";

export type PostContent = Omit<PostSeed, "cover"> & { cover?: Buffer };
export type Content = { routes: RouteSeed[]; threads: ThreadSeed[]; posts: PostContent[] };

/** Every Markdown file under a folder, nested language folders included, in name order. */
function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function readOne<T>(root: string, path: string, schema: ZodType<T>): T {
  const { fields, body } = parseFrontmatter(readFileSync(path, "utf8"));
  const parsed = schema.safeParse({ ...fields, content: body });
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`${relative(root, path)}: ${issues}`);
}

function readFolder<T>(root: string, folder: string, schema: ZodType<T>): T[] {
  return markdownFiles(join(root, folder)).map((path) => readOne(root, path, schema));
}

/** Translations naming one cover file get the same buffer, so the seed stores it once. */
function readPosts(root: string): PostContent[] {
  const covers = new Map<string, Buffer>();
  return markdownFiles(join(root, "posts")).map((path) => {
    const { cover, ...post } = readOne(root, path, postSeedSchema);
    if (cover === undefined) return post;
    const file = join(root, "posts", cover);
    const bytes = covers.get(cover) ?? (existsSync(file) ? readFileSync(file) : undefined);
    if (bytes === undefined || storableImage(bytes) === null) {
      throw new Error(`${relative(root, path)}: cover: not an image under 2 MB`);
    }
    covers.set(cover, bytes);
    return { ...post, cover: bytes };
  });
}

/** Reads the seed content tree: routes/, threads/<lang>/ and posts/<lang>/. */
export function readContent(root: string): Content {
  return {
    routes: readFolder(root, "routes", routeSeedSchema),
    threads: readFolder(root, "threads", threadSeedSchema),
    posts: readPosts(root),
  };
}
