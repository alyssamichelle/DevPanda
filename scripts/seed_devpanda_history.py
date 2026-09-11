#!/usr/bin/env python3
"""Create DevPanda experiment records and seed Managed Warehouse history.

Reads GB_API_KEY from the environment or ~/.config/growthbook/.env, and the
ingest client key from NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY in .env.local.
Does not print secrets.

Usage:
  python3 scripts/seed_devpanda_history.py --setup
  python3 scripts/seed_devpanda_history.py --seed
  python3 scripts/seed_devpanda_history.py --setup --seed
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ID = "prj_2Cc9aCKcpUmCM1FD3MDjme"
METRIC_ID = "fact__2CexGiezW5U82TnA5ek7nD"
DATASOURCE_ID = "managed_warehouse"
ASSIGNMENT_QUERY_ID = "device_id"
HASH_ATTRIBUTE = "id"
TAG = "mcp-video"
API_HOST = os.environ.get("GB_API_URL", "https://api.growthbook.io").rstrip("/")
INGEST_HOST = os.environ.get("GB_INGEST_HOST", "https://us-east-1.gb-ingest.com").rstrip("/")
EVENTS_PER_REQUEST = 100
REQUEST_INTERVAL_S = 1.05
API_INTERVAL_S = 1.05
CONVERSION_WINDOW = timedelta(hours=72)
RNG = random.Random(42)
_last_api_at = 0.0


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    return values


def resolve_secrets() -> tuple[str, str]:
    file_env = load_env_file(Path.home() / ".config/growthbook/.env")
    local_env = load_env_file(ROOT / ".env.local")
    api_key = os.environ.get("GB_API_KEY") or file_env.get("GB_API_KEY") or ""
    client_key = (
        os.environ.get("NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY")
        or local_env.get("NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY")
        or ""
    )
    if not api_key:
        sys.exit("GB_API_KEY is not set (env or ~/.config/growthbook/.env)")
    if not client_key:
        sys.exit("NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY is not set (.env.local)")
    return api_key, client_key


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def api(method: str, path: str, api_key: str, body: dict[str, Any] | None = None) -> Any:
    global _last_api_at
    wait = API_INTERVAL_S - (time.monotonic() - _last_api_at)
    if wait > 0:
        time.sleep(wait)
    url = f"{API_HOST}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    last_err: RuntimeError | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                _last_api_at = time.monotonic()
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            err = exc.read().decode("utf-8", errors="replace")
            _last_api_at = time.monotonic()
            if exc.code == 429 and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            last_err = RuntimeError(f"{method} {path} -> {exc.code}: {err}")
            break
    assert last_err is not None
    raise last_err


def find_experiment(api_key: str, tracking_key: str) -> dict[str, Any] | None:
    q = urllib.parse.urlencode(
        {
            "q": tracking_key,
            "projectId": PROJECT_ID,
            "limit": 50,
        }
    )
    payload = api("GET", f"/api/v1/experiments?{q}", api_key)
    for exp in payload.get("experiments") or []:
        if exp.get("trackingKey") == tracking_key and exp.get("project") == PROJECT_ID:
            return exp
    return None


EXPERIMENTS: list[dict[str, Any]] = [
    {
        "name": "Homepage hero CTA",
        "trackingKey": "hero-cta-text",
        "hypothesis": (
            "If we change the homepage primary CTA copy, then sign_up will rise, "
            "because a more specific promise beats a generic 'start free' label."
        ),
        "variations": [
            {"key": "0", "name": "Start Learning Free"},
            {"key": "1", "name": "Build Your First Project"},
            {"key": "2", "name": "Join 50,000 Developers"},
        ],
        "start": "2026-08-14T12:00:00.000Z",
        "stop": None,
        "result": None,
        "winner_index": None,
        "analysis": None,
        "arms": [
            {"users": 6000, "conversions": 600},
            {"users": 6000, "conversions": 609},
            {"users": 6000, "conversions": 627},
        ],
    },
    {
        "name": "Homepage social-proof badge",
        "trackingKey": "homepage-social-proof-badge",
        "hypothesis": (
            "If we show 'Join 50,000 developers' instead of 'Join 10,000', then "
            "sign_up will rise, because a larger social-proof number reduces signup hesitation."
        ),
        "variations": [
            {"key": "0", "name": "Join 10,000"},
            {"key": "1", "name": "Join 50,000"},
        ],
        "start": "2026-03-10T12:00:00.000Z",
        "stop": "2026-04-07T12:00:00.000Z",
        "result": "won",
        "winner_index": 1,
        "analysis": "Clear lift on Sign Up. Shipping the 50,000 copy.",
        "arms": [
            {"users": 21000, "conversions": 2100},
            {"users": 21000, "conversions": 2289},
        ],
    },
    {
        "name": "Course-grid CTA label",
        "trackingKey": "course-grid-cta-label",
        "hypothesis": (
            "If course cards say 'Enroll Free' instead of 'Start Learning', then "
            "sign_up will rise, because 'free' lowers perceived commitment."
        ),
        "variations": [
            {"key": "0", "name": "Start Learning"},
            {"key": "1", "name": "Enroll Free"},
        ],
        "start": "2026-03-18T12:00:00.000Z",
        "stop": "2026-04-22T12:00:00.000Z",
        "result": "inconclusive",
        "winner_index": None,
        "analysis": "No meaningful movement on Sign Up. Keep the current label.",
        "arms": [
            {"users": 14250, "conversions": 1425},
            {"users": 14250, "conversions": 1432},
        ],
    },
    {
        "name": "Signup form: require full name",
        "trackingKey": "signup-require-full-name",
        "hypothesis": (
            "If we require first and last name on the signup form, then sign_up will "
            "rise, because a more complete profile increases commitment."
        ),
        "variations": [
            {"key": "0", "name": "Email only"},
            {"key": "1", "name": "Require first+last"},
        ],
        "start": "2026-04-01T12:00:00.000Z",
        "stop": "2026-05-06T12:00:00.000Z",
        "result": "lost",
        "winner_index": None,
        "analysis": "Extra fields added friction; Sign Up dropped. Revert to email-only.",
        "arms": [
            {"users": 4100, "conversions": 459},
            {"users": 4100, "conversions": 410},
        ],
    },
    {
        "name": "Guest lesson teaser",
        "trackingKey": "guest-lesson-teaser",
        "hypothesis": (
            "If anonymous visitors can play the first lesson before creating an account, "
            "then sign_up will rise, because they experience value before the wall."
        ),
        "variations": [
            {"key": "0", "name": "Wall immediately"},
            {"key": "1", "name": "First lesson free"},
        ],
        "start": "2026-04-14T12:00:00.000Z",
        "stop": "2026-05-12T12:00:00.000Z",
        "result": "inconclusive",
        "winner_index": None,
        "analysis": "Directionally positive but far too few users to call. Do not ship on this evidence.",
        "arms": [
            {"users": 310, "conversions": 31},
            {"users": 310, "conversions": 43},
        ],
    },
    {
        "name": "Pricing: annual-first toggle",
        "trackingKey": "pricing-annual-first",
        "hypothesis": (
            "If the pricing page defaults to annual billing, then sign_up will rise, "
            "because the discounted annual number makes Pro look cheaper at the decision point."
        ),
        "variations": [
            {"key": "0", "name": "Monthly first"},
            {"key": "1", "name": "Annual first"},
        ],
        "start": "2026-04-28T12:00:00.000Z",
        "stop": "2026-06-09T12:00:00.000Z",
        "result": "won",
        "winner_index": 1,
        "analysis": "Annual-first improved Sign Up. Default the toggle to annual.",
        "arms": [
            {"users": 9700, "conversions": 951},
            {"users": 9700, "conversions": 1019},
        ],
    },
    {
        "name": "Homepage hero subhead",
        "trackingKey": "homepage-hero-subhead",
        "hypothesis": (
            "If the hero subhead leads with 'From tutorial to production in a weekend' "
            "instead of the generic tagline, then sign_up will rise, because a concrete "
            "time-to-value claim is more motivating."
        ),
        "variations": [
            {"key": "0", "name": "Generic tagline"},
            {"key": "1", "name": "Tutorial to production in a weekend"},
        ],
        "start": "2026-05-12T12:00:00.000Z",
        "stop": "2026-06-16T12:00:00.000Z",
        "result": "inconclusive",
        "winner_index": None,
        "analysis": "Small lift with an interval that still crosses zero. Keep the current subhead.",
        "arms": [
            {"users": 2050, "conversions": 205},
            {"users": 2050, "conversions": 208},
        ],
    },
    {
        "name": "Course catalog default sort",
        "trackingKey": "course-catalog-default-sort",
        "hypothesis": (
            "If /courses defaults to Most popular instead of Newest, then sign_up will "
            "rise, because social proof on the grid increases confidence to enroll."
        ),
        "variations": [
            {"key": "0", "name": "Newest"},
            {"key": "1", "name": "Most popular"},
        ],
        "start": "2026-05-27T12:00:00.000Z",
        "stop": "2026-06-24T12:00:00.000Z",
        "result": "inconclusive",
        "winner_index": None,
        "analysis": "Noisy positive; not enough volume to ship. Leave Newest as default.",
        "arms": [
            {"users": 1700, "conversions": 170},
            {"users": 1700, "conversions": 190},
        ],
    },
    {
        "name": "Hero background video autoplay",
        "trackingKey": "hero-video-autoplay",
        "hypothesis": (
            "If the homepage hero autoplays a muted course trailer, then sign_up will "
            "rise, because motion draws attention to the CTA."
        ),
        "variations": [
            {"key": "0", "name": "Static"},
            {"key": "1", "name": "Muted autoplay"},
        ],
        "start": "2026-06-09T12:00:00.000Z",
        "stop": "2026-07-14T12:00:00.000Z",
        "result": "lost",
        "winner_index": None,
        "analysis": "Autoplay hurt Sign Up — likely distraction or bounce. Keep the static hero.",
        "arms": [
            {"users": 15500, "conversions": 1566},
            {"users": 15500, "conversions": 1442},
        ],
    },
    {
        "name": "Pricing CTA: free vs trial",
        "trackingKey": "pricing-cta-free-vs-trial",
        "hypothesis": (
            "If the Pro CTA says 'Start 7-day trial' instead of 'Start free', then "
            "sign_up will rise, because a trial frames a concrete next step."
        ),
        "variations": [
            {"key": "0", "name": "Start free"},
            {"key": "1", "name": "Start 7-day trial"},
        ],
        "start": "2026-06-23T12:00:00.000Z",
        "stop": "2026-08-04T12:00:00.000Z",
        "result": "won",
        "winner_index": 1,
        "analysis": "Trial framing lifted Sign Up. Use Start 7-day trial on Pro.",
        "arms": [
            {"users": 12300, "conversions": 1046},
            {"users": 12300, "conversions": 1169},
        ],
    },
    {
        "name": "Sticky signup bar on lesson preview",
        "trackingKey": "sticky-signup-bar",
        "hypothesis": (
            "If a sticky 'Create a free account to continue' bar appears after 30s on "
            "guest lesson pages, then sign_up will rise, because the prompt catches high-intent readers."
        ),
        "variations": [
            {"key": "0", "name": "No bar"},
            {"key": "1", "name": "Sticky bar at 30s"},
        ],
        "start": "2026-07-07T12:00:00.000Z",
        "stop": "2026-08-11T12:00:00.000Z",
        "result": "inconclusive",
        "winner_index": None,
        "analysis": "Underpowered. No ship decision.",
        "arms": [
            {"users": 575, "conversions": 58},
            {"users": 575, "conversions": 59},
        ],
    },
    {
        "name": "Onboarding: skill picker vs skip",
        "trackingKey": "onboarding-skill-picker-vs-skip",
        "hypothesis": (
            "If new users pick a skill track before the catalog, then sign_up will rise, "
            "because a personalized first session feels more relevant."
        ),
        "variations": [
            {"key": "0", "name": "Skip to catalog"},
            {"key": "1", "name": "Skill picker"},
        ],
        "start": "2026-08-18T12:00:00.000Z",
        "stop": None,
        "result": None,
        "winner_index": None,
        "analysis": None,
        "arms": [
            {"users": 6400, "conversions": 640},
            {"users": 6400, "conversions": 659},
        ],
    },
    {
        "name": "Exit-intent signup modal",
        "trackingKey": "exit-intent-signup-modal",
        "hypothesis": (
            "If an exit-intent modal offers a free Python crash-course in exchange for "
            "email, then sign_up will rise, because it recaptures bounce traffic."
        ),
        "variations": [
            {"key": "0", "name": "No modal"},
            {"key": "1", "name": "Exit-intent email capture"},
        ],
        "start": "2026-08-25T12:00:00.000Z",
        "stop": None,
        "result": None,
        "winner_index": None,
        "analysis": None,
        "arms": [
            {"users": 390, "conversions": 39},
            {"users": 390, "conversions": 41},
        ],
    },
    {
        "name": "Pricing plan highlight",
        "trackingKey": "pricing-plan-highlight",
        "hypothesis": (
            "If we highlight Pro as Most Popular, then sign_up will rise, because a "
            "recommended plan reduces choice paralysis."
        ),
        "variations": [
            {"key": "0", "name": "Equal layout"},
            {"key": "1", "name": "Pro highlighted"},
        ],
        "start": "2026-08-18T12:00:00.000Z",
        "stop": "2026-09-04T12:00:00.000Z",
        "result": "inconclusive",
        "winner_index": None,
        "analysis": "No reliable Sign Up movement. Leave equal layout.",
        "arms": [
            {"users": 2700, "conversions": 270},
            {"users": 2700, "conversions": 275},
        ],
    },
    {
        "name": "Onboarding flow",
        "trackingKey": "onboarding-flow",
        "hypothesis": (
            "If we replace the skill picker with a 5-question quiz, then sign_up will "
            "rise, because a quiz feels more personalized."
        ),
        "variations": [
            {"key": "0", "name": "Skill picker"},
            {"key": "1", "name": "5-question quiz"},
        ],
        "start": "2026-08-25T12:00:00.000Z",
        "stop": None,
        "result": None,
        "winner_index": None,
        "analysis": None,
        "arms": [
            {"users": 1800, "conversions": 180},
            {"users": 1800, "conversions": 185},
        ],
    },
]


def create_or_update_experiment(api_key: str, spec: dict[str, Any]) -> dict[str, Any]:
    existing = find_experiment(api_key, spec["trackingKey"])
    body = {
        "datasourceId": DATASOURCE_ID,
        "assignmentQueryId": ASSIGNMENT_QUERY_ID,
        "hashAttribute": HASH_ATTRIBUTE,
        "trackingKey": spec["trackingKey"],
        "name": spec["name"],
        "hypothesis": spec["hypothesis"],
        "variations": spec["variations"],
        "metrics": [METRIC_ID],
        "project": PROJECT_ID,
        "tags": [TAG],
        "type": "standard",
        "phases": [
            {
                "name": "Main",
                "dateStarted": spec["start"],
                "coverage": 1,
            }
        ],
    }
    if existing:
        exp_id = existing["id"]
        print(f"  exists {spec['trackingKey']} ({exp_id})")
        api("POST", f"/api/v1/experiments/{exp_id}", api_key, {
            "metrics": [METRIC_ID],
            "tags": [TAG],
            "project": PROJECT_ID,
            "hypothesis": spec["hypothesis"],
            "name": spec["name"],
        })
        exp = api("GET", f"/api/v1/experiments/{exp_id}", api_key)["experiment"]
    else:
        try:
            created = api("POST", "/api/v1/experiments", api_key, body)
        except RuntimeError as exc:
            if "hashAttribute" in str(exc) or "assignmentQuery" in str(exc):
                body["hashAttribute"] = "device_id"
                created = api("POST", "/api/v1/experiments", api_key, body)
            else:
                raise
        exp = created["experiment"]
        print(f"  created {spec['trackingKey']} ({exp['id']})")

    exp_id = exp["id"]
    if exp.get("status") == "draft":
        try:
            started = api(
                "POST",
                f"/api/v1/experiments/{exp_id}/start",
                api_key,
                {"skipChecklist": True},
            )
            exp = started["experiment"]
            print(f"  started {spec['trackingKey']}")
        except RuntimeError:
            started = api(
                "POST",
                f"/api/v1/experiments/{exp_id}/start",
                api_key,
                {"skipChecklist": True, "ignoreWarnings": True},
            )
            exp = started["experiment"]
            print(f"  started {spec['trackingKey']} (ignored warnings)")

    variations = exp["variations"]
    traffic = [
        {"variationId": v["variationId"], "weight": round(1 / len(variations), 4)}
        for v in variations
    ]
    # Normalize 3-way to 0.3334/0.3333/0.3333 so weights sum to 1.
    if len(traffic) == 3:
        traffic[0]["weight"] = 0.3334
        traffic[1]["weight"] = 0.3333
        traffic[2]["weight"] = 0.3333
    elif len(traffic) == 2:
        traffic[0]["weight"] = 0.5
        traffic[1]["weight"] = 0.5

    phase = {
        "name": "Main",
        "dateStarted": spec["start"],
        "coverage": 1,
        "trafficSplit": traffic,
        "targetingCondition": "{}",
    }
    if spec["stop"] and spec["result"]:
        phase["dateEnded"] = spec["stop"]
    api("POST", f"/api/v1/experiments/{exp_id}", api_key, {"phases": [phase]})

    if spec["result"] and exp.get("status") != "stopped":
        stop_body: dict[str, Any] = {
            "results": spec["result"],
            "dateEnded": spec["stop"],
            "reason": "Scheduled end",
        }
        if spec.get("analysis"):
            stop_body["analysis"] = spec["analysis"]
        if spec["result"] == "won" and spec.get("winner_index") is not None:
            stop_body["winnerVariationId"] = variations[spec["winner_index"]]["variationId"]
        try:
            stopped = api(
                "POST",
                f"/api/v1/experiments/{exp_id}/stop",
                api_key,
                stop_body,
            )
            exp = stopped["experiment"]
        except RuntimeError:
            stop_body["ignoreWarnings"] = True
            stopped = api(
                "POST",
                f"/api/v1/experiments/{exp_id}/stop",
                api_key,
                stop_body,
            )
            exp = stopped["experiment"]
        print(f"  stopped {spec['trackingKey']} result={spec['result']}")
        # Re-apply historical phase dates; /stop stamps dateEnded as now unless honored.
        phase["dateEnded"] = spec["stop"]
        api("POST", f"/api/v1/experiments/{exp_id}", api_key, {"phases": [phase]})
    return exp


def setup(api_key: str) -> None:
    print("Creating / updating experiments in DevPanda…")
    for spec in EXPERIMENTS:
        create_or_update_experiment(api_key, spec)
    print("Setup done.")


def exposure_times(n: int, start: datetime, end: datetime) -> list[datetime]:
    span = (end - start).total_seconds()
    times = []
    for i in range(n):
        frac = (i + 0.5) / n
        jitter = RNG.uniform(-0.4, 0.4) * (span / max(n, 1))
        t = start + timedelta(seconds=frac * span + jitter)
        if t < start:
            t = start
        if t > end:
            t = end
        times.append(t)
    return times


def build_events(now: datetime) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    max_offset = CONVERSION_WINDOW - timedelta(minutes=30)
    min_offset = timedelta(minutes=2)
    for spec in EXPERIMENTS:
        start = parse_iso(spec["start"])
        end = parse_iso(spec["stop"]) if spec["stop"] else now - timedelta(hours=2)
        if end <= start:
            end = start + timedelta(days=1)
        for arm_i, arm in enumerate(spec["arms"]):
            n = arm["users"]
            k = arm["conversions"]
            times = exposure_times(n, start, end)
            for i, t_exp in enumerate(times):
                user_id = f"dp_{spec['trackingKey']}_{arm_i}_{i:06d}"
                attrs = {"id": user_id, "device_id": user_id}
                events.append(
                    {
                        "event_name": "Experiment Viewed",
                        "timestamp": iso(t_exp),
                        "properties": {
                            "experimentId": spec["trackingKey"],
                            "variationId": str(arm_i),
                        },
                        "attributes": attrs,
                    }
                )
                if i < k:
                    offset = timedelta(
                        seconds=RNG.uniform(min_offset.total_seconds(), max_offset.total_seconds())
                    )
                    t_conv = t_exp + offset
                    if t_conv > now - timedelta(seconds=5):
                        t_conv = now - timedelta(seconds=5)
                    if t_conv <= t_exp:
                        t_conv = t_exp + min_offset
                    if t_conv - t_exp >= CONVERSION_WINDOW:
                        t_conv = t_exp + max_offset
                    events.append(
                        {
                            "event_name": "Sign Up",
                            "timestamp": iso(t_conv),
                            "properties": {},
                            "attributes": attrs,
                        }
                    )
    events.sort(key=lambda e: e["timestamp"])
    return events


def post_batch(client_key: str, sent_at: datetime, batch: list[dict[str, Any]]) -> None:
    url = f"{INGEST_HOST}/track?client_key={urllib.parse.quote(client_key)}"
    payload = {"sentAt": iso(sent_at), "events": batch}
    data = json.dumps(payload).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(5):
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp.read()
                return
        except urllib.error.HTTPError as exc:
            err = exc.read().decode("utf-8", errors="replace")
            last_err = RuntimeError(f"ingest {exc.code}: {err}")
            if exc.code in (429, 500, 502, 503) and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            raise last_err from exc
        except urllib.error.URLError as exc:
            last_err = exc
            if attempt < 4:
                time.sleep(2 ** attempt)
                continue
            raise
    if last_err:
        raise last_err


def seed(client_key: str) -> None:
    now = datetime.now(timezone.utc)
    print("Building events…")
    events = build_events(now)
    total = len(events)
    batches = (total + EVENTS_PER_REQUEST - 1) // EVENTS_PER_REQUEST
    print(f"Sending {total} events in {batches} batches to {INGEST_HOST} (1 req/s)…")
    sent = 0
    for i in range(0, total, EVENTS_PER_REQUEST):
        batch = events[i : i + EVENTS_PER_REQUEST]
        sent_at = datetime.now(timezone.utc)
        post_batch(client_key, sent_at, batch)
        sent += len(batch)
        n = i // EVENTS_PER_REQUEST + 1
        if n == 1 or n % 25 == 0 or n == batches:
            print(f"  batch {n}/{batches} ({sent}/{total} events)")
        if i + EVENTS_PER_REQUEST < total:
            time.sleep(REQUEST_INTERVAL_S)
    print("Seed done.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--setup", action="store_true", help="Create/update experiment records")
    parser.add_argument("--seed", action="store_true", help="POST events to the ingest API")
    args = parser.parse_args()
    if not args.setup and not args.seed:
        parser.error("pass --setup and/or --seed")
    api_key, client_key = resolve_secrets()
    if args.setup:
        setup(api_key)
    if args.seed:
        seed(client_key)


if __name__ == "__main__":
    main()
