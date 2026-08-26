# Judge testing instructions

## Agent-first path

1. Open `https://zingposts.com` in a WebMCP-capable browser while signed out.
2. Ask your outside agent to inspect the available tools. It should find fifteen public tools, including `authenticate_agent`.
3. Call `get_site_capabilities` and confirm `builtInAI: false`.
4. Call `connect_agent` with an agent name. Confirm it returns `connected_public`, `approvalRequired: false`, and a handoff path.
5. Open the returned `handoffPath` and create or resume a prototype workspace. Safe prototype work attaches without a scope-approval click.
6. If that workspace is already verified, click **Bring my agent**, give the copied one-time code to the agent, and verify that `authenticate_agent` succeeds before private tools unlock.
7. Optionally open `/agents` directly and verify the active, revocable connection profile. This technical page is intentionally outside the primary human navigation.

## Person-first path

1. Log out, click **Try a prototype workspace**, and enter any test email.
2. Click **Bring my agent** and paste the copied prompt into an outside agent.
3. Verify the prompt tells the agent to open Zingposts, discover current WebMCP tools, inspect authentication state, call `connect_agent`, and start shared work.
4. Ask the outside agent to follow the prompt from the authenticated page.
5. In a prototype workspace, verify safe work begins immediately. At the first publish/contact boundary, replace the test email, follow the Supabase verification email, and confirm the account changes to **Supabase account**.
6. Click **Bring my agent** again. Confirm the verified prompt contains a one-time 10-minute agent code, the agent exchanges it with `authenticate_agent`, and the code cannot be reused.
7. Revoke the connection and verify its private access ends immediately without changing or sharing the human’s Supabase session.

## Collaboration checks

- Call `get_webmcp_manifest` and verify the catalog is grouped into views, queries, actions, and workflows.
- Open **Shared with agent** and click **Preview a sample handoff**. Verify that the sample is explicitly labeled, uses durable records, shows three real listings, and states that no AI runs inside Zingposts.
- For the real loop, call `start_collaboration_session`, then `add_collaboration_item` with `requiresHumanResponse: true`. Respond in the workbench and call `get_collaboration_session`; verify the exact human decision and text are returned and the session moves to `waiting_agent`.
- Call `get_human_attention_queue` before and after the response; verify the focused question enters and then leaves the queue.
- Confirm search, **Sell an item**, **Track a find**, filters, **Gallery / Focus / Thumbnails**, navigation, and boards all live in the collapsible left rail, leaving the rest of the viewport to the item canvas.
- Drag a gallery card, the Focus image, and a thumbnail directly onto a board in the left rail; verify the board count increments. Also verify the **+ Board** fallback.
- Ask the agent to call `set_marketplace_view`, then verify the human-visible canvas changes to the requested mode.
- Open the bottom-right **WebMCP tools** guide on Browse, a listing detail, Alerts, and Shared with agent. Verify that the useful-here group changes with the page, other page groups remain available, and the full technical map link opens `/agents`.
- Ask the agent to search, compare, create a board, and add research; verify that the UI updates to the same durable records.
- Ask it to draft a message or offer; verify that sending/submission first requires a Supabase-verified workspace, then requires a separate exact human confirmation. An authenticated agent call with `confirmed: true` must remain blocked.
- Click **Bring my agent** and verify the copied prompt instructs the agent to reopen Zingposts, rediscover tools, connect, inspect durable state, begin shared work, and preserve the human approval boundary.
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

The smoke test prints a JSON object with `ok: true`, at least 12 seeded listings, 103 WebMCP tools, fifteen public tools, category-aware boat matches, a complete collaboration loop, the four trust lanes, durable canvas preferences, grouped WebMCP organization, and `undoVerified: true`. The auth integration tests separately prove that legacy prototype access is disabled after verification, Supabase sessions are required, agent codes are single-use, agent identity is server-derived, revocation is immediate, and authenticated agents still cannot approve consequential actions.
