import {
  H1, H2, H3, Text, Stack, Row, Grid, Card, CardHeader, CardBody,
  Pill, Table, Stat, Callout, Divider, Code, Spacer,
  useHostTheme, useCanvasState,
} from "cursor/canvas";

type Tab = "overview" | "flags" | "experiments" | "analytics" | "pages" | "script";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "App Concept" },
  { id: "flags", label: "Feature Flags" },
  { id: "experiments", label: "Experiments" },
  { id: "analytics", label: "GA4 Events" },
  { id: "pages", label: "UI Flow" },
  { id: "script", label: "Demo Script" },
];

const FLAGS = [
  {
    key: "ai-course-recommendations",
    default: "false",
    description: "AI-powered 'You might also like' section based on skill tags. Off = popularity sort.",
    impact: "Enrollment rate",
    page: "/courses",
  },
  {
    key: "beta-code-playground",
    default: "false",
    description: "Embeds a live code editor inside lessons. Gated to beta users.",
    impact: "Lesson completion",
    page: "/courses/.../lessons/...",
  },
  {
    key: "pro-upsell-banner",
    default: "true",
    description: "Contextual upgrade prompt shown to free-tier users mid-lesson.",
    impact: "Pro conversion",
    page: "/courses/.../lessons/...",
  },
  {
    key: "new-dashboard-layout",
    default: "false",
    description: "New learner dashboard with progress rings, XP, and streaks.",
    impact: "Retention / DAU",
    page: "/dashboard",
  },
  {
    key: "social-proof-widget",
    default: "false",
    description: 'Hero section badge: "Join 50,000 developers learning this week."',
    impact: "Sign-up conversion",
    page: "/",
  },
];

const EXPERIMENTS = [
  {
    key: "hero-cta-text",
    page: "/",
    goal: "Sign-up conversion",
    metric: "sign_up",
    variants: [
      { name: "Control", value: "Start Learning Free", weight: "34%" },
      { name: "Variant A", value: "Build Your First Project", weight: "33%" },
      { name: "Variant B", value: "Join 50,000 Developers", weight: "33%" },
    ],
    hypothesis: "Social proof or action-oriented copy outperforms a generic free-tier CTA on sign-up rate.",
  },
  {
    key: "pricing-plan-highlight",
    page: "/pricing",
    goal: "Pro plan checkout starts",
    metric: "checkout_start (plan=pro)",
    variants: [
      { name: "Control", value: "All three plans displayed equally", weight: "50%" },
      { name: "Variant", value: 'Pro highlighted with "Most Popular" badge', weight: "50%" },
    ],
    hypothesis: "Anchoring Pro as the recommended tier increases Pro checkout starts.",
  },
  {
    key: "onboarding-flow",
    page: "/onboarding",
    goal: "First lesson complete within 24h",
    metric: "lesson_complete (session_day=0)",
    variants: [
      { name: "Control", value: "Pick skill level → Browse all courses", weight: "50%" },
      { name: "Variant", value: "5-question quiz → Personalized course path", weight: "50%" },
    ],
    hypothesis: "A curated path increases early activation vs. free browsing.",
  },
];

const GA4_EVENTS = [
  { event: "page_view", trigger: "Every navigation (GA4 auto page_view off)", params: "page_title, page_location" },
  { event: "sign_up", trigger: "Registration complete", params: "method (google | email | github)" },
  { event: "course_view", trigger: "Course detail page opened", params: "course_id, course_name, category, is_free" },
  { event: "lesson_start", trigger: "Lesson content begins rendering", params: "lesson_id, course_id, lesson_number" },
  { event: "lesson_complete", trigger: "User marks lesson complete (idempotent)", params: "lesson_id, course_id, time_spent_seconds" },
  { event: "cta_click", trigger: "Any primary CTA button clicked", params: "cta_text, location" },
  { event: "pricing_view", trigger: "Pricing page load", params: "highlighted_plan" },
  { event: "begin_checkout", trigger: "Plan selected (GA4 ecommerce)", params: "currency, value, items" },
  { event: "purchase", trigger: "Subscription confirmed (GA4 ecommerce)", params: "transaction_id, currency, value, items" },
  { event: "experiment_viewed", trigger: "GrowthBook assigns a variation (once per experiment)", params: "experiment_id, variation_id" },
  { event: "feature_flag_evaluated", trigger: "Flag usage, deduped per (flag, value) / session", params: "flag_key, flag_value" },
];

const PAGES = [
  {
    path: "/",
    name: "Home",
    flags: ["social-proof-widget"],
    experiment: "hero-cta-text",
    keyEvents: ["page_view", "cta_click", "sign_up"],
  },
  {
    path: "/courses",
    name: "Course Browser",
    flags: ["ai-course-recommendations"],
    experiment: "—",
    keyEvents: ["course_view"],
  },
  {
    path: "/courses/[slug]",
    name: "Course Detail",
    flags: ["beta-code-playground"],
    experiment: "—",
    keyEvents: ["course_view", "lesson_start"],
  },
  {
    path: "/courses/[slug]/lessons/[id]",
    name: "Lesson Player",
    flags: ["pro-upsell-banner", "beta-code-playground"],
    experiment: "—",
    keyEvents: ["lesson_start", "lesson_complete", "checkout_start"],
  },
  {
    path: "/pricing",
    name: "Pricing",
    flags: ["—"],
    experiment: "pricing-plan-highlight",
    keyEvents: ["pricing_view", "checkout_start", "checkout_complete"],
  },
  {
    path: "/onboarding",
    name: "Onboarding",
    flags: ["—"],
    experiment: "onboarding-flow",
    keyEvents: ["sign_up", "cta_click"],
  },
  {
    path: "/dashboard",
    name: "Learner Dashboard",
    flags: ["new-dashboard-layout"],
    experiment: "—",
    keyEvents: ["lesson_complete", "page_view"],
  },
  {
    path: "/demo",
    name: "Demo Control Panel",
    flags: ["all"],
    experiment: "all",
    keyEvents: ["—"],
  },
];

const DEMO_STEPS = [
  {
    step: 1,
    title: "Set the scene",
    tool: "Browser",
    action: "Open the DevPanda home page at /",
    quote:
      "This is DevPanda — a fictional developer learning platform. Simple by design. But every flag and experiment is wired to real GrowthBook and GA4 calls.",
  },
  {
    step: 2,
    title: "Live flag toggle",
    tool: "GrowthBook",
    action: "Features → toggle ai-course-recommendations ON → refresh /courses",
    quote:
      "Watch the course grid change. I did that without touching code or shipping a deploy. The flag is evaluated by the GrowthBook SDK — bootstrapped from a cached server payload, so there's no flicker.",
  },
  {
    step: 3,
    title: "Experiment assignment",
    tool: "/demo panel",
    action: "Open /demo → show current bucket for hero-cta-text",
    quote:
      "Every visitor gets randomly bucketed into a variant at evaluation time. It's consistent across sessions and works without a server round-trip.",
  },
  {
    step: 4,
    title: "BigQuery experiment analysis",
    tool: "BigQuery",
    action: "Run lesson_complete funnel query grouped by experiment_variant",
    quote:
      "This query pulls from GA4's raw export and joins experiment_viewed exposures to sign_up — so the rate covers everyone exposed, not just clickers. We let GrowthBook's stats engine call significance instead of eyeballing a p-value.",
  },
  {
    step: 5,
    title: "The aha moment — rollback in seconds",
    tool: "GrowthBook",
    action: "Toggle new-dashboard-layout OFF → refresh /dashboard",
    quote:
      "The completion-rate guardrail regressed for the group that saw the new dashboard, so I flipped the flag off before anyone filed a ticket. A rollout is observational — that's a signal to roll back, and I'd run it as a proper experiment to confirm the effect. No hotfix, no incident.",
  },
];

function OverviewTab() {
  const theme = useHostTheme();
  return (
    <Stack gap={28}>
      <Stack gap={6}>
        <H2>DevPanda</H2>
        <Text tone="secondary">A fictional developer learning platform — your demo vehicle for GrowthBook, GA4, and BigQuery</Text>
      </Stack>

      <Grid columns={4} gap={16}>
        <Stat value="5" label="Feature flags" />
        <Stat value="3" label="Experiments" />
        <Stat value="10" label="GA4 events" />
        <Stat value="8" label="Pages" />
      </Grid>

      <Divider />

      <Stack gap={12}>
        <H3>Why this concept works</H3>
        {[
          {
            point: "Instant recognition",
            detail: "Every developer has used a learning platform. No concept-selling needed before the demo starts.",
          },
          {
            point: "Clear conversion funnel",
            detail: "Browse → Sign up → Enroll → Complete lesson → Upgrade. Every step is a trackable GA4 event.",
          },
          {
            point: "Flags that feel earned",
            detail: "Beta features, AI recommendations, and upsell banners arise naturally from the product — not bolted on.",
          },
          {
            point: "Classic A/B targets",
            detail: "CTA copy, pricing layout, onboarding flow. These are real experiments SaaS teams run every day.",
          },
          {
            point: "The meta angle",
            detail: "A developer education demo about a developer education app. The irony is memorable.",
          },
        ].map(({ point, detail }) => (
          <Row key={point} gap={12} align="start">
            <div
              style={{
                width: 3,
                height: 3,
                borderRadius: 9999,
                background: theme.accent.primary,
                marginTop: 9,
                flexShrink: 0,
              }}
            />
            <Text>
              <Text weight="semibold" as="span">{point}: </Text>
              {detail}
            </Text>
          </Row>
        ))}
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H3>Stack</H3>
        <Grid columns={3} gap={10}>
          {[
            { tool: "Next.js 16", role: "App Router + Proxy" },
            { tool: "GrowthBook", role: "Feature flags + experiments" },
            { tool: "GA4", role: "Event tracking" },
            { tool: "BigQuery", role: "Experiment analysis" },
            { tool: "Tailwind CSS", role: "Styling" },
            { tool: "TypeScript", role: "End-to-end types" },
          ].map(({ tool, role }) => (
            <Card key={tool}>
              <CardHeader>{tool}</CardHeader>
              <CardBody>
                <Text tone="secondary" size="small">{role}</Text>
              </CardBody>
            </Card>
          ))}
        </Grid>
      </Stack>

      <Callout tone="info" title="The aha moment">
        "I ran the new dashboard as a monitored rollout. The lesson-completion guardrail regressed for the exposed group, so I flipped the flag off in seconds — before a single user filed a support ticket. (A rollout is observational; run it as an experiment for a causal read.)"
      </Callout>
    </Stack>
  );
}

function FlagsTab() {
  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H2>Feature Flags</H2>
        <Text tone="secondary">5 flags across the app — each tied to a page, a measurable outcome, and a realistic use case</Text>
      </Stack>
      <Table
        headers={["Flag key", "Default", "What it controls", "Metric to watch", "Page"]}
        rows={FLAGS.map((f) => [
          <Code>{f.key}</Code>,
          <Pill tone={f.default === "true" ? "success" : "neutral"} size="sm">
            {f.default}
          </Pill>,
          f.description,
          f.impact,
          <Code style={{ fontSize: 11 }}>{f.page}</Code>,
        ])}
        striped
      />
      <Text tone="tertiary" size="small">
        Flags are evaluated by the GrowthBook SDK, bootstrapped on the server (cached payload + a stable anon id from the proxy cookie) and hydrated on the client — so the first render matches the server HTML with no layout shift. The proxy sets the cookie; it does not render flags.
      </Text>
    </Stack>
  );
}

function ExperimentsTab() {
  const theme = useHostTheme();
  return (
    <Stack gap={28}>
      <Stack gap={6}>
        <H2>Experiments</H2>
        <Text tone="secondary">3 A/B tests targeting the most impactful points in the funnel</Text>
      </Stack>
      {EXPERIMENTS.map((exp) => (
        <Card key={exp.key}>
          <CardHeader trailing={<Pill tone="info" size="sm">{exp.page}</Pill>}>{exp.key}</CardHeader>
          <CardBody>
            <Stack gap={16}>
              <Grid columns={2} gap={16}>
                <Stack gap={4}>
                  <Text size="small" tone="tertiary" weight="semibold">Goal</Text>
                  <Text>{exp.goal}</Text>
                </Stack>
                <Stack gap={4}>
                  <Text size="small" tone="tertiary" weight="semibold">Primary metric</Text>
                  <Code>{exp.metric}</Code>
                </Stack>
              </Grid>
              <Stack gap={6}>
                <Text size="small" tone="tertiary" weight="semibold">Variants</Text>
                {exp.variants.map((v) => (
                  <Row key={v.name} gap={10} align="center">
                    <Pill tone={v.name === "Control" ? "neutral" : "info"} size="sm">
                      {v.name}
                    </Pill>
                    <Text as="span">{v.value}</Text>
                    <Spacer />
                    <Text tone="tertiary" size="small" as="span">{v.weight}</Text>
                  </Row>
                ))}
              </Stack>
              <div style={{ background: theme.fill.tertiary, borderRadius: 6, padding: "8px 12px" }}>
                <Text size="small" tone="secondary">
                  <Text weight="semibold" size="small" as="span">Hypothesis: </Text>
                  {exp.hypothesis}
                </Text>
              </div>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </Stack>
  );
}

function AnalyticsTab() {
  return (
    <Stack gap={24}>
      <Stack gap={6}>
        <H2>GA4 Events</H2>
        <Text tone="secondary">10 events covering the full learning funnel — all automatically exported to BigQuery</Text>
      </Stack>
      <Table
        headers={["Event name", "Fires when", "Key parameters"]}
        rows={GA4_EVENTS.map((e) => [
          <Code>{e.event}</Code>,
          e.trigger,
          <Code style={{ fontSize: 11 }}>{e.params}</Code>,
        ])}
        striped
      />

      <H3>Key BigQuery queries for the demo</H3>
      <Stack gap={10}>
        <Card collapsible defaultOpen>
          <CardHeader>Funnel: browse → sign up → enroll → complete</CardHeader>
          <CardBody>
            <Text tone="secondary" size="small">
              Join <Code>page_view</Code> → <Code>sign_up</Code> → <Code>course_view</Code> → <Code>lesson_complete</Code> on <Code>user_pseudo_id</Code>.
              Group by signup cohort week to see activation trends over time.
            </Text>
          </CardBody>
        </Card>
        <Card collapsible defaultOpen>
          <CardHeader>Experiment lift: sign-up rate by hero-cta variation</CardHeader>
          <CardBody>
            <Text tone="secondary" size="small">
              Join <Code>experiment_viewed</Code> exposures (carrying <Code>variation_id</Code>) to <Code>sign_up</Code>
              on <Code>user_pseudo_id</Code> with <Code>conversion_ts &gt;= exposure_ts</Code>. Rate is computed over
              everyone exposed, not just clickers — let GrowthBook judge significance.
            </Text>
          </CardBody>
        </Card>
        <Card collapsible defaultOpen>
          <CardHeader>Rollout guardrail: new-dashboard-layout vs lesson completion</CardHeader>
          <CardBody>
            <Text tone="secondary" size="small">
              Join <Code>feature_flag_evaluated</Code> (where <Code>flag_key = 'new-dashboard-layout'</Code>, deduped
              exposure) to <Code>lesson_complete</Code> on <Code>user_pseudo_id</Code> with a timestamp bound. A drop
              is an observational guardrail signal to roll back — run it as an experiment for a causal read.
            </Text>
          </CardBody>
        </Card>
      </Stack>
    </Stack>
  );
}

function PagesTab() {
  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H2>UI Flow</H2>
        <Text tone="secondary">8 pages — each purposefully connected to a flag, experiment, or key event</Text>
      </Stack>
      <Table
        headers={["Route", "Page name", "Active flags", "Experiment", "Key events"]}
        rows={PAGES.map((p) => [
          <Code style={{ fontSize: 11 }}>{p.path}</Code>,
          p.name,
          <Row key={p.path + "-flags"} gap={4} wrap>
            {p.flags.map((f) =>
              f === "—" ? (
                <Text key="none" tone="tertiary" as="span">—</Text>
              ) : (
                <Code key={f} style={{ fontSize: 10 }}>{f}</Code>
              )
            )}
          </Row>,
          p.experiment === "—" ? (
            <Text tone="tertiary" as="span">—</Text>
          ) : (
            <Code style={{ fontSize: 11 }}>{p.experiment}</Code>
          ),
          <Row key={p.path + "-events"} gap={4} wrap>
            {p.keyEvents.map((e) =>
              e === "—" ? (
                <Text key="none" tone="tertiary" as="span">—</Text>
              ) : (
                <Code key={e} style={{ fontSize: 10 }}>{e}</Code>
              )
            )}
          </Row>,
        ])}
        striped
      />
      <Callout tone="neutral" title="The /demo page">
        Add a <Code>/demo</Code> route that renders a control panel showing current flag states, active experiment variants, and recent GA4 events. This page is essential for live demos and blog post screenshots.
      </Callout>
    </Stack>
  );
}

function ScriptTab() {
  const theme = useHostTheme();
  return (
    <Stack gap={28}>
      <Stack gap={6}>
        <H2>Demo Walkthrough Script</H2>
        <Text tone="secondary">5 steps, ~8 minutes. Works for blog posts, screen recordings, and live demos.</Text>
      </Stack>

      <Stack gap={20}>
        {DEMO_STEPS.map((step) => (
          <Row key={step.step} gap={16} align="start">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: theme.accent.primary,
                color: theme.text.onAccent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {step.step}
            </div>
            <Stack gap={8} style={{ flex: 1 }}>
              <Row gap={8} align="center">
                <Text weight="semibold">{step.title}</Text>
                <Pill tone="neutral" size="sm">{step.tool}</Pill>
              </Row>
              <div
                style={{
                  background: theme.fill.tertiary,
                  borderRadius: 6,
                  padding: "6px 12px",
                }}
              >
                <Text size="small" tone="secondary">
                  <Text weight="semibold" size="small" as="span">Do: </Text>
                  {step.action}
                </Text>
              </div>
              <Text tone="secondary" size="small" italic>
                "{step.quote}"
              </Text>
            </Stack>
          </Row>
        ))}
      </Stack>

      <Divider />

      <Callout tone="success" title="Closing line">
        "In 8 minutes you've seen a flag control a live UI change with no deploy, an experiment randomly assign users to variants, and BigQuery surface a regression before users noticed. That's the full GrowthBook + GA4 loop — no custom dashboards required."
      </Callout>
    </Stack>
  );
}

export default function DevPandaDemoDesign() {
  const [activeTab, setActiveTab] = useCanvasState<Tab>("activeTab", "overview");

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "flags":
        return <FlagsTab />;
      case "experiments":
        return <ExperimentsTab />;
      case "analytics":
        return <AnalyticsTab />;
      case "pages":
        return <PagesTab />;
      case "script":
        return <ScriptTab />;
    }
  };

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 920 }}>
      <Stack gap={4}>
        <Row gap={10} align="center">
          <H1>DevPanda — Demo App Design</H1>
          <Pill tone="info">GrowthBook + GA4 + BigQuery</Pill>
        </Row>
        <Text tone="secondary">Developer education demo · Next.js · Feature flags + Experimentation + Analytics</Text>
      </Stack>

      <Row gap={6} wrap>
        {TABS.map((tab) => (
          <Pill
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Pill>
        ))}
      </Row>

      <Divider />

      {renderTab()}
    </Stack>
  );
}
