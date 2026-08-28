# Judge testing instructions

## Agent-first path

1. Open `https://zingposts.com` in a WebMCP-capable browser while signed out.
2. Ask your outside agent to inspect the available tools. It should find exactly five setup tools: `get_agent_bootstrap`, `authenticate_agent`, `start_agent_onboarding`, `get_onboarding_status`, and `open_for_human_review`.
3. Call `get_agent_bootstrap`; confirm it reports `setup-only`, no workspace data, and the canonical guide URL.
4. Call `start_agent_onboarding` with an agent name. Confirm it returns `awaiting_user`, `approvalRequired: false`, and a handoff path.
5. Open the returned `handoffPath` and create or resume a prototype workspace. Safe prototype work attaches without a scope-approval click.
6. After sign-in, rediscover tools in the same browser and verify the safe workspace catalog appears without an agent code. Call `get_agent_bootstrap` and confirm the canonical identity is `Browser agent via …`.
7. Optionally open `/agents` and create a one-use code or invite for separate-browser access. Verify that independent session is expiring and revocable. This advanced technical page is intentionally outside the primary human navigation.

## Person-first path

1. Log out, click **Try a prototype workspace**, and enter any test email.
2. Click **Bring my agent** and paste the copied guide URL into an outside agent.
3. Verify `/for-agents` clearly explains WebMCP preflight, `get_agent_bootstrap`, capability activation, human review, reconnect, and safety; verify `/api/agent-guide` returns the same versioned contract as JSON.
4. Ask the outside agent to follow the guide from the authenticated page.
5. In a prototype workspace, verify safe work begins immediately. At the first publish/contact boundary, replace the test email, follow the Supabase verification email, and confirm the account changes to **Supabase account**.
6. Click **Bring my agent** again. Confirm it copies the short `/for-agents` URL without a credential or private session data.
7. Verify browser-delegated access ends when the person signs out. Separately verify that an optional independent agent session can be revoked without changing the person’s Supabase session.

## Collaboration checks

- Call `get_webmcp_manifest` and verify every tool appears exactly once in the persistent core or one capability group.
- Call `get_workspace_resume`, acknowledge its returned checkpoint with `acknowledge_workspace_checkpoint`, and call resume again; verify already-processed activity is not replayed.
- Call `get_work_and_blockers`; verify each item has structured `blockedBy`, `missingInputs`, `decisionNeeded`, `requiresHuman`, and `agentCanContinueWith` fields rather than forcing the agent to parse prose.
- Create a sourced change set, preview its semantic changes, and try to apply it as an agent; verify the agent receives `HUMAN_REQUIRED`. As the person, select only some changes and verify only those changes apply. Change an underlying record first and verify a stale expected version produces a conflict.
- Record a private listing outcome and call `get_outcome_patterns`; verify the response reports sample size, counts, prices, and reasons, explicitly avoids a model-generated score, and cautions on small samples.
- Navigate through multiple human pages and verify the registered count stays bounded. Call `activate_capability` and verify the focused pack changes without navigating; call `open_for_human_review` and verify navigation does not change the active pack.
- Open **Shared with agent** and click **Preview a sample handoff**. Verify that the sample is explicitly labeled, uses durable records, shows three real listings, and states that no AI runs inside Zingposts.
- For the real loop, call `start_collaboration_session`, then `add_collaboration_item` with `requiresHumanResponse: true`. Respond in the workbench and call `get_collaboration_session`; verify the exact human decision and text are returned and the session moves to `waiting_agent`.
- Call `get_human_attention_queue` before and after the response; verify the focused question enters and then leaves the queue.
- Confirm search, **Sell an item**, **Track a find**, filters, **Gallery / Focus / Thumbnails**, navigation, and boards all live in the collapsible left rail, leaving the rest of the viewport to the item canvas.
- Drag a gallery card, the Focus image, and a thumbnail directly onto a board in the left rail; verify the board count increments. Also verify the **+ Board** fallback.
- Ask the agent to call `set_marketplace_view`, then verify the human-visible canvas changes to the requested mode.
- Open the bottom-right **WebMCP tools** guide on Browse, a listing detail, Alerts, and Shared with agent. Verify it distinguishes the active capability pack from the person’s visible page and links to `/for-agents`.
- Ask the agent to search, compare, create a board, and add research; verify that the UI updates to the same durable records.
- Ask it to draft a message or offer; verify that sending/submission first requires a Supabase-verified workspace, then requires a separate exact human confirmation. An authenticated agent call with `confirmed: true` must remain blocked.
- Click **Bring my agent** and verify the copied value is only the canonical guide URL—not a long prompt, credential, or exposed MCP catalog.
- Start a QA run, create test artifacts with its `qaRunId`, preview the exact cleanup set, and verify cleanup requires one human confirmation and cannot target unrelated records.
- Confirm that no control claims Zingposts is generating “agent picks” or running a resident model.
- Open **Activity & undo** to inspect attribution and undo a reversible action.

## Human-only checks

- **Sell an item** accepts a listing photo and creates a native draft.
- A native seller draft can request publication, which stops for account verification and confirmation.
- **Track a find** creates an outside listing with a source-authority warning.
- Alerts begin as drafts and require confirmation before activation.
- Full-screen listing details support previous/next buttons and arrow keys.
- The navigation rail collapses and persists the preference.
- Mobile layout preserves first-visit onboarding, search, and inventory.

## Local verification

```bash
npm ci
npm run dev
```

In a second terminal:

```bash
npm run test:types
npm run lint
npm run test:smoke
npm run build -- --webpack
```

With Supabase test credentials in the environment, also run `npm run test:human-auth` and `npm run test:agent-auth`.

## Expected automated result

The smoke test prints `ok: true` with at least 12 seeded listings and confirms all 121 catalog tools, unique manifest coverage, bootstrap, durable resume checkpoints, structured blockers, selective change-set review, transparent outcome patterns, guide delivery, capability activation without navigation, Virginia sailboat alert matching, truck relevance, strict state transitions, structured errors, optimistic concurrency, a human-agent loop, consequential gates, and namespaced cleanup. The auth tests separately prove required Supabase sessions, single-use code and invite exchange, canonical agent identity and profile reuse, revocation, and non-bypassable human approval.
