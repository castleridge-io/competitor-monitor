# Product F: Competitor Monitor - Context

Execute product meta-loop cycle:

## PRE-CHECK: Loop Status

Read `.business/state/meta.json`
- IF `status` == "killed" OR `status` == "queued":
  - Log: "Loop disabled - product status: {status}"
  - EXIT cycle (do nothing)

## OBSERVE

1. Read state files:
   - `~/projects/competitor-monitor/.business/state/tasks.md`
   - `~/projects/competitor-monitor/.business/state/blockers.md`
   - `~/projects/competitor-monitor/.business/state/meta.json`

2. Check user messages (Telegram topic 4781)

## DECIDE

Based on state and messages:
- What's highest priority task?
- Any blockers to resolve?
- User requests?

## ACT

Execute tasks:
- Spawn coding agents if needed
- Update state files
- Resolve blockers if possible

## REFLECT

Capture learnings:
- Log decisions to `.business/logs/`
- Update patterns

## UPDATE

Write state:
- Increment cycleCount
- Update timestamps
- Log to daily log

---

## CRITICAL RULES

- Never deploy without VPS access
- Test scraper locally before deploying
- VPN required for all scraping
- User must approve pricing changes

---

**Product:** F. Competitor Monitor
**Code:** `~/projects/competitor-monitor/`
**Landing:** https://montelai.github.io/competitor-monitor-landing/
