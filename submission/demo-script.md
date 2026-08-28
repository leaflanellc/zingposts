# Zingposts demo script

Target runtime: 2 minutes 50 seconds. Record with one outside agent connected to a WebMCP-capable browser.

## 0:00–0:18 — A marketplace, not a chatbot

“Finding an old boat is fun. The hard part is turning dozens of listings into a decision without losing the person’s taste and judgment.”

Show the canvas-first Browse page. Search for `boat`, switch quickly through Gallery, Focus, and Thumbnails, and drag one listing onto a board in the left rail.

“Zingposts owns the listings and workflow. It has no LLM and no built-in agent. My outside agent gets a structured action surface through WebMCP.”

## 0:18–0:48 — One URL, no second login

While signed in, click **Bring my agent**. Paste the copied `/for-agents` URL into the outside agent that can access this browser.

“People should not have to understand MCP. One URL opens the canonical guide. Because I am already signed in, safe workspace tools appear in this browser without another agent-login ceremony.”

Have the agent rediscover tools and call `get_agent_bootstrap`. Show the server-derived identity `Browser agent via …`, the workspace overview, and the attention queue. Point out that browser delegation ends with the person’s browser session; a one-use invite or ten-minute code remains an advanced option for separate-browser or unattended work.

Briefly mention the reverse path: while signed out, an outside agent sees only five setup tools, calls `get_agent_bootstrap`, then `start_agent_onboarding`, and opens the returned handoff for the person. After sign-in it rediscovers the workspace tools.

## 0:48–1:38 — Resume, propose, decide

Open **Shared with agent**.

Ask the outside agent to:

1. call `get_workspace_resume` and summarize what changed since its acknowledged checkpoint;
2. call `get_work_and_blockers` and identify the one decision that needs the person;
3. search for boats and create a sourced `change_set` containing a shortlist, board update, and research note.

As the tool calls execute, point out the live agent activity pulse. Open the proposal card and show the plain-language preview, sources, expected versions, and checkboxes.

“This is not a chat transcript or a blind batch action. The agent can return after a day, see exactly what changed, and prepare a versioned proposal. I decide which parts become shared state.”

Uncheck one change and apply the rest. Show the resulting board and research note, then have the agent call `acknowledge_workspace_checkpoint` only after it has processed the response.

Show that the next resume call returns no already-processed work. Briefly show `record_listing_outcome` on a listing and `get_outcome_patterns`: exact counts, prices, and reasons, with no opaque AI score.

## 1:38–2:16 — Prepare freely, commit carefully

Ask the agent to draft a seller message based on the chosen boat and request that it be sent.

“Inside the signed-in workspace, research, organization, alerts, and drafts stay fluid. The first real marketplace action asks me to replace a test email if needed and verify through Supabase. The agent still cannot approve its own outbound action.”

Show the unified attention queue, then open **Review exact action**. Point out who prepared it, the recipient, the exact message, and the raw payload. Approve once or decline. Mention that even an authenticated agent supplying `confirmed: true` cannot bypass this separate human gate.

## 2:16–2:40 — Trustworthy agent ergonomics

Open the small **WebMCP tools** guide. Show the stable core, active capability pack, and the person’s independently visible page. Have the agent call `activate_capability` and show that the focused tools change without navigation or accumulation. Then show **Activity & undo** and undo one reversible action. The public agent guide is linked for judges.

“The 121 tools use progressive discovery: one persistent bootstrap core plus one focused pack. Resume state is checkpointed, blockers are structured, mutations support idempotency and versions, and human-review navigation stays optional.”

## 2:40–2:50 — Close

Return to **Shared with agent**.

“The agent does the breadth. The person supplies taste, permission, and commitment. Zingposts gives both of them the same durable marketplace objects to work on together.”

## Recording checklist

- Use the deployed HTTPS URL, not localhost.
- Keep the video public or unlisted on YouTube and under three minutes.
- Record clear audio.
- Start from the logged-out first-visit page.
- Use a real outside agent for the WebMCP calls; the clearly labeled sample handoff is only a fallback for judge exploration.
- Do not imply Zingposts contains a model.
- Avoid showing personal browser tabs, notifications, credentials, or private handoff links after the demo.
- Confirm that the repository and live app links are in the video description.
