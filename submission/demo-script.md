# Zingposts demo script

Target runtime: 2 minutes 40 seconds. Record with one outside agent connected to a WebMCP-capable browser.

## 0:00–0:18 — A marketplace, not a chatbot

“Finding an old boat is fun. The hard part is turning dozens of listings into a decision without losing the person’s taste and judgment.”

Show the canvas-first Browse page. Search for `boat`, switch quickly through Gallery, Focus, and Thumbnails, and drag one listing onto a board in the left rail.

“Zingposts owns the listings and workflow. It has no LLM and no built-in agent. My outside agent gets a structured action surface through WebMCP.”

## 0:18–0:48 — One URL, no second login

While signed in, click **Bring my agent**. Paste the copied `/for-agents` URL into the outside agent that can access this browser.

“People should not have to understand MCP. One URL opens the canonical guide. Because I am already signed in, safe workspace tools appear in this browser without another agent-login ceremony.”

Have the agent rediscover tools and call `get_agent_bootstrap`. Show the server-derived identity `Browser agent via …`, the workspace overview, and the attention queue. Point out that browser delegation ends with the person’s browser session; a one-use invite or ten-minute code remains an advanced option for separate-browser or unattended work.

Briefly mention the reverse path: while signed out, an outside agent sees only five setup tools, calls `get_agent_bootstrap`, then `start_agent_onboarding`, and opens the returned handoff for the person. After sign-in it rediscovers the workspace tools.

## 0:48–1:32 — The shared workbench

Open **Shared with agent**.

Ask the outside agent to:

1. call `start_collaboration_session` with the objective “Choose a characterful old boat under $20,000”;
2. search for boats and call `add_collaboration_item` with a three-listing recommendation, rationale, two or three options, and `requiresHumanResponse: true`.

As the tool calls execute, point out the live agent activity pulse. Show the recommendation in the shared canvas with real listing cards.

“This is not a chat transcript. The agent has placed structured work on a durable marketplace canvas. It knows exactly when my judgment is needed.”

Choose an option and add one sentence of guidance. Then have the agent call `get_collaboration_session`.

Show that the returned result contains the exact human response and that the session moved from `waiting_human` to `waiting_agent`. Have the agent add a follow-up research note or update the session summary.

## 1:32–2:08 — Prepare freely, commit carefully

Ask the agent to draft a seller message based on the chosen boat and request that it be sent.

“Inside the signed-in workspace, research, organization, alerts, and drafts stay fluid. The first real marketplace action asks me to replace a test email if needed and verify through Supabase. The agent still cannot approve its own outbound action.”

Show the unified attention queue, then open **Review exact action**. Point out who prepared it, the recipient, the exact message, and the raw payload. Approve once or decline. Mention that even an authenticated agent supplying `confirmed: true` cannot bypass this separate human gate.

## 2:08–2:30 — Trustworthy agent ergonomics

Open the small **WebMCP tools** guide. Show the stable core, active capability pack, and the person’s independently visible page. Have the agent call `activate_capability` and show that the focused tools change without navigation or accumulation. Then show **Activity & undo** and undo one reversible action. The public agent guide is linked for judges.

“The 110 tools use progressive discovery: one persistent bootstrap core plus one focused pack. Mutations support idempotency and versions, failures are structured, and human-review navigation stays optional.”

## 2:30–2:40 — Close

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
