import { HomeView } from "../home";
import { Layout } from "../layout";
import { useLanguage } from "./useLanguage";

/** The home page inside the shared layout; the newsletter form lives in its community section. */
export function HomePage() {
  const language = useLanguage();
  return (
    <Layout language={language} footerNewsletter={false}>
      <HomeView language={language} />
    </Layout>
  );
}
