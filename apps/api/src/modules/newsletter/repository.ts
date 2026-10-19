import type { Database } from "../../db/client.js";
import type { NewsletterRepository } from "./model.js";
import { deliveryQueries } from "./repository/deliveries.js";
import { highlightQueries } from "./repository/highlights.js";
import { issueQueries } from "./repository/issues.js";
import { subscriberQueries } from "./repository/subscribers.js";

export function createNewsletterRepository(db: Database): NewsletterRepository {
  return {
    ...subscriberQueries(db),
    ...issueQueries(db),
    ...highlightQueries(db),
    ...deliveryQueries(db),
  };
}
