import {
  Bot,
  Cable,
  FlaskConical,
  Mail,
  MessagesSquare,
  Newspaper,
  PackagePlus,
  PenLine,
  Route,
  Trophy,
  Vote,
} from "lucide-preact";
import type { FunctionComponent } from "preact";

export type Feature = {
  key: string;
  path: string;
  icon: FunctionComponent<{ size?: number; "aria-hidden"?: boolean }>;
};

/** Every module a visitor can open, in the order of the spec: integrations first, community next. */
export const features: readonly Feature[] = [
  { key: "routes", path: "/routes", icon: Route },
  { key: "publish", path: "/routes/new", icon: PenLine },
  { key: "track", path: "/sandbox", icon: FlaskConical },
  { key: "relay", path: "/sandbox", icon: Cable },
  { key: "mcp", path: "/docs", icon: Bot },
  { key: "discussions", path: "/discussions", icon: MessagesSquare },
  { key: "blog", path: "/blog", icon: Newspaper },
  { key: "newsletter", path: "/newsletter", icon: Mail },
  { key: "ranking", path: "/ranking", icon: Trophy },
  { key: "propose", path: "/services/propose", icon: PackagePlus },
  { key: "simulator", path: "/simulator-requests", icon: Vote },
];
