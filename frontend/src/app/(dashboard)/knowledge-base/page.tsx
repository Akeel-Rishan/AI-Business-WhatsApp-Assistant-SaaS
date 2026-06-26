"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Circle,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/shared/CircularProgress";
import { useKnowledgeBaseOverview } from "@/hooks/useKnowledgeBaseOverview";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import type { BusinessInstructions, FAQ, KnowledgeBaseItem, KnowledgeOverview } from "@/types/database";

type SearchResult = {
  id: string;
  type: "faq" | "item" | "instruction";
  title: string;
  body: string;
  href: string;
  badge: string;
};

const WARNING_COPY: Record<string, { tone: "critical" | "warning" | "muted"; message: string; detail: string; href: string; cta: string }> = {
  no_faqs: {
    tone: "critical",
    message: "Your AI has no FAQs to reference",
    detail: "Add at least 5 FAQs covering your most common customer questions.",
    href: "/knowledge-base/faqs",
    cta: "Add FAQs"
  },
  no_pricing: {
    tone: "warning",
    message: "No pricing information in knowledge base",
    detail: "Customers frequently ask about prices. Add pricing details to avoid AI guessing.",
    href: "/knowledge-base/items?category=pricing",
    cta: "Add Pricing"
  },
  no_delivery: {
    tone: "warning",
    message: "No delivery information added",
    detail: "Add delivery areas, charges, and timeframes.",
    href: "/knowledge-base/items?category=delivery",
    cta: "Add Delivery Info"
  },
  no_policy: {
    tone: "warning",
    message: "No return or refund policy found",
    detail: "Add your policies so the AI can handle complaints and returns correctly.",
    href: "/knowledge-base/items?category=policy",
    cta: "Add Policy"
  },
  no_instructions: {
    tone: "muted",
    message: "AI personality not configured",
    detail: "Configure your AI's name, tone, and instructions for better customer experience.",
    href: "/knowledge-base/instructions",
    cta: "Configure AI"
  }
};

function scoreLabel(score: number) {
  if (score <= 40) return "Not Ready";
  if (score <= 70) return "Getting There";
  if (score <= 90) return "Almost Ready";
  return "Fully Ready";
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function highlight(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-yellow-400/25 px-1 text-yellow-100">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function searchInstructions(instructions: BusinessInstructions): SearchResult[] {
  const sections: Array<[string, string | null]> = [
    ["Assistant Name", instructions.assistant_name],
    ["Personality", instructions.personality_description],
    ["Greeting", instructions.conversation_opener],
    ["Always Do Rules", instructions.always_do_rules.join(", ")],
    ["Never Do Rules", instructions.never_do_rules.join(", ")],
    ["Restricted Topics", instructions.restricted_topics.join(", ")],
    ["Escalation Message", instructions.escalation_message],
    ["Conversation Closer", instructions.conversation_closer],
    ["After Hours Message", instructions.after_hours_message]
  ];

  return sections
    .filter(([, body]) => typeof body === "string" && body.trim().length > 0)
    .map(([title, body]) => ({
      id: `instruction-${title}`,
      type: "instruction" as const,
      title,
      body: body ?? "",
      href: "/knowledge-base/instructions",
      badge: "Instructions"
    }));
}

function buildSearchResults(overview: KnowledgeOverview, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const faqResults: SearchResult[] = overview.faqs.map((faq) => ({
    id: faq.id,
    type: "faq",
    title: faq.question,
    body: faq.answer,
    href: "/knowledge-base/faqs",
    badge: "FAQ"
  }));
  const itemResults: SearchResult[] = overview.items.map((item) => ({
    id: item.id,
    type: "item",
    title: item.title,
    body: item.content,
    href: `/knowledge-base/items?category=${item.category}`,
    badge: item.category
  }));

  return [...faqResults, ...itemResults, ...searchInstructions(overview.instructions)].filter((result) =>
    `${result.title} ${result.body} ${result.badge}`.toLowerCase().includes(normalized)
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  color,
  number,
  label,
  subtext,
  onClick
}: {
  href?: string;
  icon: typeof HelpCircle;
  color: string;
  number: string | number;
  label: string;
  subtext: string;
  onClick?: () => void;
}) {
  const content = (
    <Card
      className="group h-full cursor-pointer rounded-xl border-[#1f1f1f] bg-[#111111] transition hover:border-brand/60"
      onClick={onClick}
    >
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-xl", color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{number}</div>
          <div className="mt-1 text-sm font-medium text-zinc-300">{label}</div>
          <div className="mt-2 text-xs text-zinc-500">{subtext}</div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function KnowledgeBasePage() {
  const { business, loading: userLoading } = useUser();
  const { overview, loading, error, refetch } = useKnowledgeBaseOverview(business?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const searchResults = useMemo(
    () => (overview ? buildSearchResults(overview, debouncedQuery) : []),
    [debouncedQuery, overview]
  );

  const checklist = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: "Business profile completed",
        done: overview.hasName && overview.hasDescription && overview.hasHours,
        href: "/settings",
        action: "Complete Profile"
      },
      {
        label: "WhatsApp number added",
        done: Boolean(business?.whatsapp_number),
        href: "/settings",
        action: "Add Number"
      },
      {
        label: "At least 5 FAQs added",
        done: overview.activeFaqs >= 5,
        href: "/knowledge-base/faqs",
        action: "Add FAQs"
      },
      {
        label: "Products or services added",
        done: (overview.itemsByCategory.product ?? 0) + (overview.itemsByCategory.service ?? 0) > 0,
        href: "/knowledge-base/items",
        action: "Add Items"
      },
      {
        label: "Pricing information added",
        done: (overview.itemsByCategory.pricing ?? 0) > 0,
        href: "/knowledge-base/items?category=pricing",
        action: "Add Pricing"
      },
      {
        label: "Return/refund policy added",
        done: (overview.itemsByCategory.policy ?? 0) > 0,
        href: "/knowledge-base/items?category=policy",
        action: "Add Policy"
      },
      {
        label: "AI personality configured",
        done: overview.hasAssistantName && overview.hasPersonality,
        href: "/knowledge-base/instructions",
        action: "Configure AI"
      },
      {
        label: "WhatsApp connected",
        done: overview.hasWhatsapp,
        href: "/settings",
        action: "Connect WhatsApp",
        badge: "Phase 3"
      }
    ];
  }, [business?.whatsapp_number, overview]);

  const completedChecklist = checklist.filter((item) => item.done).length;

  const activities = useMemo(() => {
    if (!overview) return [];
    return [
      ...overview.recentFaqs.map((faq) => ({
        id: `faq-${faq.id}`,
        icon: HelpCircle,
        color: "bg-brand/15 text-brand",
        title: `${faq.created_at === faq.updated_at ? "Added" : "Updated"} FAQ: ${truncate(faq.question, 40)}`,
        timestamp: new Date(faq.updated_at).getTime(),
        time: relativeTime(faq.updated_at),
        badge: "FAQ"
      })),
      ...overview.recentItems.map((item) => ({
        id: `item-${item.id}`,
        icon: item.created_at === item.updated_at ? Plus : Pencil,
        color: item.created_at === item.updated_at ? "bg-brand/15 text-brand" : "bg-blue-500/15 text-blue-300",
        title: `${item.created_at === item.updated_at ? "Added" : "Updated"} ${item.category}: ${truncate(item.title, 40)}`,
        timestamp: new Date(item.updated_at).getTime(),
        time: relativeTime(item.updated_at),
        badge: item.category
      }))
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [overview]);

  const coverage = useMemo(() => {
    if (!overview) return [];
    const itemCount = (category: string) => overview.itemsByCategory[category] ?? 0;
    return [
      { label: "FAQs", count: overview.activeFaqs, max: 10, suffix: "active" },
      { label: "Products", count: itemCount("product"), max: 5, suffix: "items" },
      { label: "Services", count: itemCount("service"), max: 5, suffix: "items" },
      { label: "Pricing", count: itemCount("pricing"), max: 3, suffix: "items" },
      { label: "Policies", count: itemCount("policy"), max: 3, suffix: "items" },
      { label: "Delivery Info", count: itemCount("delivery"), max: 2, suffix: "items" },
      { label: "AI Instructions", count: overview.instructionsFilledCount, max: 8, suffix: "sections" }
    ];
  }, [overview]);

  if (userLoading || loading) {
    return <DashboardSkeleton />;
  }

  if (error || !overview) {
    return (
      <Card className="rounded-xl border-red-500/30 bg-red-500/10">
        <CardHeader>
          <CardTitle>Could not load knowledge base overview</CardTitle>
          <CardDescription>{error ?? "Create a business profile before opening this dashboard."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  const topicCount = Object.values(overview.itemsByCategory).filter((count) => count > 0).length + overview.totalFaqs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-brand">
            <Sparkles className="h-4 w-4" />
            AI knowledge command center
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-white">Knowledge Base</h1>
          <p className="mt-2 text-sm text-muted-foreground">Everything your AI knows about your business</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 bg-brand text-black hover:bg-brand/90">
              Add Content
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/knowledge-base/faqs">Add FAQ</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/knowledge-base/items">Add Product / Service</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/knowledge-base/items?category=policy">Add Policy</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/knowledge-base/instructions">Edit AI Instructions</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-xl border-[#1f1f1f] bg-[#111111]">
          <CardHeader>
            <CardTitle>AI Readiness Score</CardTitle>
            <CardDescription>How prepared is your AI to handle customer questions?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <CircularProgress value={overview.readinessScore} label="/ 100" sublabel={scoreLabel(overview.readinessScore)} />
            <p className="mt-6 text-xs text-muted-foreground">Last updated: {new Date().toLocaleString()}</p>
            <button
              className="mt-3 text-sm font-semibold text-brand hover:text-brand/80"
              onClick={() => document.getElementById("setup-checklist")?.scrollIntoView({ behavior: "smooth" })}
            >
              Improve Score -&gt;
            </button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            href="/knowledge-base/faqs"
            icon={HelpCircle}
            color="bg-brand/15 text-brand"
            number={overview.totalFaqs}
            label="FAQs"
            subtext={`${overview.activeFaqs} active - ${overview.inactiveFaqs} inactive`}
          />
          <StatCard
            href="/knowledge-base/items"
            icon={BookOpen}
            color="bg-blue-500/15 text-blue-300"
            number={overview.totalItems}
            label="Knowledge Items"
            subtext={`${overview.itemsByCategory.product ?? 0} products - ${overview.itemsByCategory.service ?? 0} services`}
          />
          <StatCard
            href="/knowledge-base/instructions"
            icon={Brain}
            color="bg-purple-500/15 text-purple-300"
            number={overview.instructionsFilledCount}
            label="Instructions Set"
            subtext="out of 8 sections"
          />
          <StatCard
            icon={ShieldCheck}
            color="bg-yellow-500/15 text-yellow-300"
            number={`${topicCount} topics`}
            label="Topics Covered"
            subtext="across all content"
            onClick={() => document.getElementById("coverage-map")?.scrollIntoView({ behavior: "smooth" })}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card id="setup-checklist" className="rounded-xl border-[#1f1f1f] bg-[#111111]">
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
            <CardDescription>Complete these steps to maximize AI accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-white">{completedChecklist} / 8 completed</span>
                <span className="text-muted-foreground">{Math.round((completedChecklist / 8) * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#2a2a2a]">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700"
                  style={{ width: `${(completedChecklist / 8) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => {
                const Icon = item.done ? CheckCircle2 : Circle;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-[#1f1f1f] bg-black/20 p-3">
                    <Icon className={cn("h-5 w-5", item.done ? "text-brand" : "text-zinc-600")} />
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm font-medium", item.done ? "text-white" : "text-zinc-400")}>{item.label}</div>
                    </div>
                    {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                    {!item.done ? (
                      <Link className="text-xs font-semibold text-brand hover:text-brand/80" href={item.href}>
                        {item.action} -&gt;
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#1f1f1f] bg-[#111111]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-300" />
              Knowledge Gaps
            </CardTitle>
            <CardDescription>Issues that may affect AI response quality</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.warnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-brand/20 bg-brand/10 p-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-brand" />
                <h3 className="mt-4 text-lg font-semibold text-white">Your knowledge base looks great!</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Your AI is well-equipped to handle customer questions.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1f1f1f]">
                {overview.warnings.map((key) => {
                  const warning = WARNING_COPY[key];
                  if (!warning) return null;
                  return (
                    <div key={key} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <AlertTriangle
                        className={cn(
                          "mt-1 h-5 w-5 shrink-0",
                          warning.tone === "critical" && "text-red-400",
                          warning.tone === "warning" && "text-yellow-300",
                          warning.tone === "muted" && "text-zinc-500"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white">{warning.message}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{warning.detail}</p>
                      </div>
                      <Link className="shrink-0 text-sm font-semibold text-brand hover:text-brand/80" href={warning.href}>
                        {warning.cta}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-[#1f1f1f] bg-[#111111]">
        <CardHeader>
          <CardTitle>Search Knowledge Base</CardTitle>
          <CardDescription>Search across FAQs, products, services, policies, and AI instructions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search across FAQs, products, services, policies..."
              className="h-12 rounded-xl border-[#2a2a2a] bg-black/30 pl-12 text-base"
            />
          </div>

          {debouncedQuery.trim() ? (
            <div className="mt-5 space-y-4">
              {searchResults.length === 0 ? (
                <div className="rounded-xl border border-[#1f1f1f] bg-black/20 p-6 text-sm text-muted-foreground">
                  No results for "{debouncedQuery}"
                </div>
              ) : (
                (["faq", "item", "instruction"] as const).map((type) => {
                  const group = searchResults.filter((result) => result.type === type);
                  if (group.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {type === "faq" ? "FAQs" : type === "item" ? "Items" : "Instructions"}
                      </div>
                      <div className="space-y-2">
                        {group.map((result) => (
                          <Link
                            key={result.id}
                            href={result.href}
                            className="flex gap-3 rounded-xl border border-[#1f1f1f] bg-black/20 p-4 transition hover:border-brand/50"
                          >
                            <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-brand" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{highlight(result.title, debouncedQuery)}</h3>
                                <Badge variant="secondary" className="capitalize">
                                  {result.badge}
                                </Badge>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {highlight(truncate(result.body, 160), debouncedQuery)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-xl border-[#1f1f1f] bg-[#111111]">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest changes to your knowledge base</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="rounded-xl border border-[#1f1f1f] bg-black/20 p-8 text-center">
                <p className="font-semibold text-white">No recent activity yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Changes to your knowledge base will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-center gap-4 rounded-xl border border-[#1f1f1f] bg-black/20 p-4">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", activity.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{activity.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {activity.badge}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="coverage-map" className="rounded-xl border-[#1f1f1f] bg-[#111111]">
          <CardHeader>
            <CardTitle>Topic Coverage</CardTitle>
            <CardDescription>What your AI knows about</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {coverage.map((topic) => {
                const width = Math.min(100, Math.round((topic.count / topic.max) * 100));
                return (
                  <div key={topic.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{topic.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {topic.count} {topic.suffix}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#2a2a2a]">
                      <div className="h-full rounded-full bg-brand transition-all duration-1000" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-sm italic text-muted-foreground">
              Tip: Aim for full coverage in all areas for best AI performance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
