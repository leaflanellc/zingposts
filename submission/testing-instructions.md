# Judge testing instructions

## Agent-first path

1. Open `https://zingposts.com` in a WebMCP-capable browser while signed out.
2. Ask your outside agent to inspect the available tools. It should find eleven public tools.
3. Call `get_site_capabilities` and confirm `builtInAI: false`.
4. Call `connect_agent` with an agent name. Confirm it returns `connected_public`, `approvalRequired: false`, and a handoff path.
5. Open the returned `handoffPath` and sign in. The safe workspace profile should attach automatically without a scope-approval click.
6. Optionally open `/agents` directly and verify the active, revocable connection profile. This technical page is intentionally outside the primary human navigation.

## Person-first path

1. Log out, click **Create my workspace**, and sign in.
2. Click **Bring my agent** and paste the copied prompt into an outside agent.
3. Verify the prompt tells the agent to open Zingposts, discover current WebMCP tools, call `connect_agent`, inspect existing workspace state, and start shared work.
4. Ask the outside agent to follow the prompt from the authenticated page.
5. Verify that safe workspace work begins immediately, with no pairing code or approval prompt.
6. Optionally open `/agents` directly, revoke the connection, and verify that its status changes without changing the user password.

## Collaboration checks

- Call `get_webmcp_manifest` and verify the catalog is grouped into views, queries, actions, and workflows.
- Open **Shared with agent** and click **Preview a sample handoff**. Verify that the sample is explicitly labeled, uses durable records, shows three real listings, and states that no AI runs inside Zingposts.
- For the real loop, call `start_collaboration_session`, then `add_collaboration_item` with `requiresHumanResponse: true`. Respond in the workbench and call `get_collaboration_session`; verify the exact human decision and text are returned and the session moves to `waiting_agent`.
- Call `get_human_attention_queue` before and after the response; verify the focused question enters and then leaves the queue.
- Confirm search, **Sell an item**, **Track a find**, filters, **Gallery / Focus / Thumbnails**, navigation, and boards all live in the collapsible left rail, leaving the rest of the viewport to the item canvas.
- Drag a gallery card, the Focus image, and a thumbnail directly onto a board in the left rail; verify the board count increments. Also verify the **+ Board** fallback.
- Ask the agent to call `set_marketplace_view`, then verify the human-visible canvas changes to the requested mode.
- Ask the agent to search, compare, create a board, and add research; verify that the UI updates to the same durable records.
- Ask it to draft a message or offer; verify that sending/submission first asks the signed-in person to verify, then requires a separate human confirmation. An agent call with `confirmed: true` must remain blocked.
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
npm run build
```

## Expected automated result

The smoke test prints a JSON object with `ok: true`, at least 12 seeded listings, 85 WebMCP tools, eleven public tools, category-aware boat matches, a complete collaboration loop, immediate safe workspace connection, verified-human outbound gates, durable canvas preferences, grouped WebMCP organization, and `undoVerified: true`.
