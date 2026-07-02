import { Button } from "@components/Button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@components/Collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Separator } from "@components/Separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@components/Sheet";
import {
  applyThemePreference,
  type ThemePreference,
  useThemeStore,
} from "@core/theme/themeStore";
import { algorithmPuzzles } from "@pages/AlgorithmsPage/sets/algorithmSetMetadata";
import { notationGuides } from "@pages/NotationsPage/notationGuides";
import { cn } from "@src/lib/utils";
import {
  localeFromPathname,
  localizedPath,
  type SeoLocale,
  stripLocalePrefix,
} from "@src/seo/routes";
import {
  BookOpen,
  ChevronsUpDown,
  Clock3,
  Database,
  GitFork,
  Globe2,
  LayoutDashboard,
  ListTree,
  Moon,
  Palette,
  PanelLeft,
  Sun,
  Video,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink as RouterNavLink, useLocation } from "react-router";

export type PageNavRoute =
  | "algorithms"
  | "api"
  | "channels"
  | "notations"
  | "sites"
  | "solve"
  | "timer";

const githubUrl = "https://github.com/williamisnotdefined/rubiks-cube-solver";

type PageNavProps = {
  activeRoute: PageNavRoute;
};

type NavItem = {
  active: boolean;
  end?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
};

type NavGroup = {
  defaultOpen?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  route: PageNavRoute;
  subItems: NavItem[];
};

export function PageNav({ activeRoute }: PageNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  const pagePath = stripLocalePrefix(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = t(activeRouteLabelKey(activeRoute));

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 md:hidden">
        <Button
          aria-expanded={mobileOpen}
          aria-label={t("navigation.openMenu")}
          size="icon"
          type="button"
          variant="outline"
          onClick={() => setMobileOpen(true)}
        >
          <PanelLeft aria-hidden="true" className="size-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none">
            Speedcube.com.br
          </p>
          <p className="truncate text-xs text-muted-foreground">{title}</p>
        </div>
      </header>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          className="w-[18rem] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          side="left"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>{t("navigation.primary")}</SheetDescription>
          </SheetHeader>
          <NavContent
            activeRoute={activeRoute}
            locale={locale}
            pagePath={pagePath}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <aside className="hidden h-dvh w-64 shrink-0 border-e bg-sidebar text-sidebar-foreground md:flex">
        <NavContent
          activeRoute={activeRoute}
          locale={locale}
          pagePath={pagePath}
        />
      </aside>
    </>
  );
}

function NavContent({
  activeRoute,
  locale,
  pagePath,
  onNavigate,
}: {
  activeRoute: PageNavRoute;
  locale: SeoLocale;
  pagePath: string;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setThemePreference = useThemeStore((state) => state.setThemePreference);
  const groups = navGroups(t, locale, activeRoute, pagePath);

  function setTheme(themePreference: ThemePreference) {
    setThemePreference(themePreference);
    applyThemePreference(themePreference);
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-2 p-2">
      <div className="flex h-14 items-center gap-2 rounded-lg px-2">
        <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <img
            alt=""
            aria-hidden="true"
            className="size-7"
            src="/favicon.svg"
          />
        </div>
        <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
          <span className="truncate font-semibold">Speedcube.com.br</span>
        </div>
      </div>
      <Separator />
      <nav
        aria-label={t("navigation.primary")}
        className="min-h-0 flex-1 overflow-y-auto py-2"
      >
        <div className="grid gap-4">
          <SidebarGroup label={t("navigation.groups.main")}>
            <SidebarLink
              active={activeRoute === "solve"}
              icon={LayoutDashboard}
              label={t("navigation.solve")}
              to={localizedPath("/solve", locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === "timer"}
              icon={Clock3}
              label={t("navigation.timer")}
              to={localizedPath("/timer", locale)}
              onNavigate={onNavigate}
            />
          </SidebarGroup>
          <SidebarGroup label={t("navigation.groups.explore")}>
            <SidebarLink
              active={activeRoute === "channels"}
              icon={Video}
              label={t("navigation.channels")}
              to={localizedPath("/channels", locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === "sites"}
              icon={Globe2}
              label={t("navigation.sites")}
              to={localizedPath("/sites", locale)}
              onNavigate={onNavigate}
            />
            <SidebarLink
              active={activeRoute === "api"}
              icon={Database}
              label={t("navigation.api")}
              to={localizedPath("/api/wca-data", locale)}
              onNavigate={onNavigate}
            />
          </SidebarGroup>
          <SidebarGroup label={t("navigation.groups.learn")}>
            {groups.map((group) => (
              <SidebarCollapsibleGroup
                group={group}
                key={group.route}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarGroup>
        </div>
      </nav>
      <Separator />
      <div className="grid gap-1">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              type="button"
              variant="ghost"
            >
              <Palette aria-hidden="true" className="size-4" />
              <span className="flex-1 text-start">{t("navigation.theme")}</span>
              {theme === "dark" ? (
                <Moon aria-hidden="true" className="size-4" />
              ) : (
                <Sun aria-hidden="true" className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as ThemePreference)}
            >
              <DropdownMenuRadioItem value="system">
                {t("navigation.themeSystem")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                {t("navigation.themeLight")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                {t("navigation.themeDark")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild className="w-full justify-start gap-2" variant="ghost">
          <a
            aria-label={t("navigation.github")}
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            <GitFork aria-hidden="true" className="size-4" />
            <span>{t("navigation.github")}</span>
          </a>
        </Button>
      </div>
    </div>
  );
}

function SidebarGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="grid gap-1">
      <h2 className="px-2 text-xs font-medium text-sidebar-foreground/70">
        {label}
      </h2>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}

function SidebarLink({
  active,
  end,
  icon: Icon,
  label,
  onNavigate,
  to,
}: NavItem & { onNavigate?: () => void }) {
  return (
    <RouterNavLink
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
        {
          "bg-sidebar-accent font-medium text-sidebar-accent-foreground":
            active,
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground":
            !active,
        },
      )}
      end={end}
      to={to}
      onClick={onNavigate}
    >
      {Icon === undefined ? null : (
        <Icon aria-hidden="true" className="size-4 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </RouterNavLink>
  );
}

function SidebarCollapsibleGroup({
  group,
  onNavigate,
}: {
  group: NavGroup;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;

  return (
    <Collapsible className="group/collapsible" defaultOpen={group.defaultOpen}>
      <CollapsibleTrigger asChild>
        <button
          aria-current={group.defaultOpen ? "page" : undefined}
          className={cn(
            "flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
            {
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground":
                group.defaultOpen,
            },
          )}
          type="button"
        >
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{group.label}</span>
          <ChevronsUpDown
            aria-hidden="true"
            className="ms-auto size-4 text-muted-foreground"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="CollapsibleContent">
        <div className="ms-4 grid gap-1 border-s px-2 py-1">
          {group.subItems.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function navGroups(
  t: (key: string) => string,
  locale: SeoLocale,
  activeRoute: PageNavRoute,
  pagePath: string,
): NavGroup[] {
  return [
    {
      defaultOpen: activeRoute === "notations",
      icon: BookOpen,
      label: t("navigation.notations"),
      route: "notations",
      subItems: notationGuides.map((guide) => ({
        active: pagePath === guide.path,
        label: guide.puzzle,
        to: localizedPath(guide.path, locale),
      })),
    },
    {
      defaultOpen: activeRoute === "algorithms",
      icon: ListTree,
      label: t("navigation.algorithms"),
      route: "algorithms",
      subItems: [
        {
          active: pagePath === "/algoritmos",
          end: true,
          label: t("navigation.allAlgorithms"),
          to: localizedPath("/algoritmos", locale),
        },
        ...algorithmPuzzles.map((puzzle) => ({
          active:
            pagePath === puzzle.path || pagePath.startsWith(`${puzzle.path}/`),
          label: puzzle.title,
          to: localizedPath(puzzle.path, locale),
        })),
      ],
    },
  ];
}

function activeRouteLabelKey(activeRoute: PageNavRoute) {
  if (activeRoute === "algorithms") {
    return "navigation.algorithms";
  }

  if (activeRoute === "notations") {
    return "navigation.notations";
  }

  if (activeRoute === "timer") {
    return "navigation.timer";
  }

  if (activeRoute === "channels") {
    return "navigation.channels";
  }

  if (activeRoute === "sites") {
    return "navigation.sites";
  }

  if (activeRoute === "api") {
    return "navigation.api";
  }

  return "navigation.solve";
}
