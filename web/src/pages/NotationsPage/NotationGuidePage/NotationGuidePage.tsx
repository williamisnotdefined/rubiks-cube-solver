import { PageScaffold } from "@components/layout/PageScaffold";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router";
import { NotationGuideNav } from "../components/NotationGuideNav";
import { NotationVisualizer } from "../components/NotationVisualizer";
import { getNotationGuide } from "../notationGuides";

export function NotationGuidePage() {
  const { t } = useTranslation();
  const { puzzleId } = useParams();
  const guide = getNotationGuide(puzzleId);

  if (guide === undefined) {
    return <Navigate replace to="/notations/3x3" />;
  }

  return (
    <PageScaffold contentClassName="max-w-6xl gap-4">
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid min-w-0 gap-4">
          {guide.visualization === undefined ? (
            <section className="border border-app-border bg-app-surface p-4">
              <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-app-text sm:text-2xl">
                {t("notations.page.underConstruction")}
              </h2>
            </section>
          ) : (
            <NotationVisualizer guide={guide} />
          )}
        </div>
        <NotationGuideNav />
      </div>
    </PageScaffold>
  );
}
