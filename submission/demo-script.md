# Zingposts demo script

Target runtime: 2 minutes 30 seconds. Record with one outside agent connected to a WebMCP-capable browser.

## 0:00–0:20 — A marketplace, not a chatbot

“I love looking for old cars, boats, and machinery, but the real problem starts after search: organizing finds, researching condition, watching changes, negotiating, and sometimes coordinating a trade.”

Show that the left rail owns search, listing actions, filters, views, navigation, and board drop targets, leaving almost the entire viewport to the Browse canvas. Switch from Gallery to Focus, flip once, drag the focused item to a rail board, then open a native listing full-screen. Briefly open an outside listing and point out its source warning.

“Zingposts owns this marketplace and its structured workflow. It contains no LLM and no built-in agent.”

## 0:20–0:50 — Agent arrives first

Log out to show the first-visit page.

“Either side can arrive first. Before I sign in, my outside agent can discover ten public WebMCP tools, inspect the grouped capability manifest and public listings, and connect to the public lane immediately.”

Have the outside agent call `connect_agent` with a name. Show `connected_public` and `approvalRequired: false`, then open the returned handoff path.

Sign in as the user. Show that the agent’s safe workspace profile attaches automatically without an approval click.

## 0:50–1:15 — Durable connection, page-scoped WebMCP

Open **Agent access**.

“The page supplies deterministic tools; my agent supplies the intelligence. WebMCP discovery belongs to the active page, so Zingposts does not pretend this is a permanent socket. It persists the safe agent profile, preferences, and shared workspace.”

Show the active profile and click **Copy reconnect skill starter**. Briefly show the Open, Connect, Collaborate, Verify sequence.

## 1:15–1:50 — Work together on the same objects

Ask the outside agent to:

1. inspect `get_webmcp_manifest` and switch the shared canvas to Thumbnails;
2. search for pre-1980 boats under $15,000;
3. create a board and add the strongest four results;
4. add a cited risk note to the Whaler;
5. draft a seller message and offer;
6. create a trade room.

Show each result appear in Zingposts. Explain that the agent called typed WebMCP tools rather than guessing screen coordinates.

## 1:50–2:12 — Human control

Show the confirmation tray.

“The agent can prepare research, organization, messages, offers, and trades. It cannot publish, send, submit, invite, or pay without verified account state and a visible human decision.”

Show the one-time verification prompt, then the separate review-and-confirm tray. Dismiss one request and approve another. Open **Messages & offers** to show the resulting state.

## 2:12–2:30 — Return and monitor

Open **Activity & undo** and undo one reversible agent action.

“For future work, a local skill remembers how to reopen Zingposts and rediscover its tools. An automation can revisit saved alerts on a schedule. Zingposts keeps the durable records; the user’s agent keeps the reasoning.”

End on Browse with Zingposts visible.

## Recording checklist

- Use the deployed HTTPS URL, not localhost.
- Keep the video public or unlisted on YouTube and under three minutes.
- Record clear audio.
- Start from the logged-out first-visit page.
- Use a real outside agent for the WebMCP calls; do not imply Zingposts contains a model.
- Avoid showing personal browser tabs, notifications, credentials, or private handoff links after the demo.
- Confirm that the repository and live app links are in the video description.
