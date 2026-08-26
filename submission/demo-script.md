# Zingposts demo script

Target runtime: 2 minutes 40 seconds. Record with one outside agent connected to a WebMCP-capable browser.

## 0:00–0:18 — A marketplace, not a chatbot

“Finding an old boat is fun. The hard part is turning dozens of listings into a decision without losing the person’s taste and judgment.”

Show the canvas-first Browse page. Search for `boat`, switch quickly through Gallery, Focus, and Thumbnails, and drag one listing onto a board in the left rail.

“Zingposts owns the listings and workflow. It has no LLM and no built-in agent. My outside agent gets a structured action surface through WebMCP.”

## 0:18–0:42 — Either side can arrive first

Log out and click **My agent is here first**.

“Before I create a workspace, an agent can discover eleven public tools, search the marketplace, interpret an alert, and call `connect_agent` to prepare a private handoff. Or I can create the workspace first and connect my agent from inside.”

Show the four-step agent-first modal. Have the outside agent call `connect_agent`, then open the returned handoff path and create the workspace. Show that safe access attaches without a pairing-code ceremony.

## 0:42–1:32 — The shared workbench

Open **Agent workbench**.

Ask the outside agent to:

1. call `start_collaboration_session` with the objective “Choose a characterful old boat under $20,000”;
2. search for boats and call `add_collaboration_item` with a three-listing recommendation, rationale, two or three options, and `requiresHumanResponse: true`.

As the tool calls execute, point out the live WebMCP activity pulse. Show the recommendation in the shared canvas with real listing cards.

“This is not a chat transcript. The agent has placed structured work on a durable marketplace canvas. It knows exactly when my judgment is needed.”

Choose an option and add one sentence of guidance. Then have the agent call `get_collaboration_session`.

Show that the returned result contains the exact human response and that the session moved from `waiting_human` to `waiting_agent`. Have the agent add a follow-up research note or update the session summary.

## 1:32–2:05 — Prepare freely, commit carefully

Ask the agent to draft a seller message based on the chosen boat and request that it be sent.

“Inside the workspace, research, organization, alerts, and drafts stay fluid. At the marketplace edge, identity and intent matter.”

Show the unified attention queue, then open **Review exact action**. Point out who prepared it, the recipient, the exact message, and the raw payload. Approve once or decline. Mention that an agent-supplied `confirmed: true` cannot bypass this gate.

## 2:05–2:28 — Trustworthy agent ergonomics

Briefly show **Agent access** and the grouped tool map.

“The 85 tools are grouped by views, queries, actions, collaboration, and workflows. Mutations support idempotency, safe actions support dry runs, failures are structured, and every result returns a stable place in the human interface.”

Show **Activity & undo** and undo one reversible agent action.

## 2:28–2:40 — Close

Return to the workbench.

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
