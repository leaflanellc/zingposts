# Zingposts — Devpost submission draft

## Tagline

Interesting things, organized together: a WebMCP-ready marketplace where people work with the outside agents they already trust.

## Inspiration

Browsing old cars, boats, campers, motorcycles, and machinery is fun. Managing the hunt is not. Good finds get lost across tabs, marketplace search misses obvious matches, alerts are rigid, research lives in scattered notes, and negotiations have no shared memory. A three-way trade is almost impossible to reason about cleanly.

Zingposts starts from a different premise: the marketplace should be equally legible to people and their agents without embedding a model in the product. The site owns its native listings and structured deal workflow, while outside listings can be tracked as clearly labeled snapshots.

## What it does

Zingposts is a complete peer-to-peer marketplace and durable workspace for interesting things.

People can browse realistic native inventory, create and publish listings, upload photos, save finds, build boards, set alerts, keep research notebooks, message sellers, prepare offers, and create structured multi-party trade rooms. Outside finds can be tracked without confusing them with Zingposts-owned inventory.

A connected outside agent receives 78 structured WebMCP tools. It can search with compound criteria, compare candidates, organize boards, tag and rank finds, record cited research and inspection risks, monitor price changes, draft communications and offers, calculate acquisition cost, propose trade scenarios, and coordinate the shared gallery, focus, or thumbnail canvas. The human uses the same structure through a canvas-first interface: search, filters, views, actions, and board drop targets live in one collapsible rail. Zingposts itself contains no LLM.

Either side can arrive first. A person can sign in and let their agent connect immediately for safe work from the authenticated page. Or an unauthenticated agent can inspect ten public tools, including a grouped capability manifest, begin public discovery, and hand the user a sign-in link that automatically attaches its safe workspace profile. Verification and explicit human approval become mandatory only when an action publishes inventory or reaches another marketplace participant.

The human remains in control. Publishing, enabling notifications, sending a message, submitting or responding to an offer, and inviting a trade participant stop at a visible confirmation gate. Every human and agent action is attributed, and reversible work can be undone.

## Why WebMCP is essential

Without WebMCP, an agent has to infer intent from buttons and screen position. That is brittle for a marketplace with dozens of interdependent objects: listings, boards, research, alerts, conversations, offers, people, assets, and constraints.

WebMCP gives Zingposts a stable collaboration language. “Find pre-1980 boats under $15,000, put the best four on a board, record the title risks, and draft a message to the strongest seller” becomes a sequence of typed, attributable actions. The human can watch the same state change, refine it directly, and approve the parts that cross a consequential boundary.

That makes the product meaningfully better with an agent—not merely automatable.

## How we built it

Zingposts uses React 19 and Next.js on Netlify. Supabase Postgres holds marketplace and workflow state, while Supabase Storage holds listing photos. Versioned SQL migrations define 18 persistent tables and keep direct browser access locked behind row-level security.

The browser client registers 78 declarative tools on the WebMCP `modelContext` surface. Each tool includes a distinct name, task-specific description, JSON input schema, and safety annotation. `get_webmcp_manifest` organizes them as views, queries, actions, and workflows so an agent does not need to reason over an undifferentiated catalog. Tool execution flows through the same server-side action layer as the human UI, with an explicit agent identity.

The action layer enforces listing ownership, creates reviewable drafts, writes an activity event for every mutation, stores inverse operations for undo, and converts consequential operations into pending confirmation records. Agents connect immediately to a safe workspace lane rather than stopping at a pairing prompt. Account verification and a separate human confirmation are deferred until publishing or outbound buyer/seller activity is requested.

The marketplace is seeded with original project-owned imagery and realistic records so the full human-agent workflow is understandable immediately. WebMCP tool registration is page-scoped, while Zingposts durably stores connection profiles, scopes, alerts, boards, research, drafts, and audit history. A generated skill starter shows agents how to reconnect safely on future visits and scheduled monitoring runs.

## Challenges

The main design challenge was not adding more agent power; it was deciding where that power should stop. We separated preparation from commitment. Research, organization, comparison, and drafting can proceed quickly. Communication, publication, notifications, invitations, and financial commitments pause for the human.

We also designed external-listing tracking so provenance stays honest. Zingposts can organize an outside find, but it never claims that its cached price, availability, or seller statements are authoritative.

## Accomplishments

- A coherent marketplace, not a WebMCP proof of concept
- 78 tools spanning onboarding, shared canvas views, discovery, organization, negotiation, and multi-party trade
- Agent-first and person-first onboarding with ten safe public tools before sign-in
- No built-in AI or model dependency
- Agent authentication through revocable scopes rather than password sharing
- Durable attribution, confirmations, and undo
- Native seller photo upload and publishing workflow
- Clear separation between owned listings and outside tracked snapshots
- Production build, automated API smoke tests, desktop browser testing, and mobile verification

## What we learned

Human-agent collaboration works best when both sides operate on the same durable objects. A board is better than a chat-only list. A research notebook is better than an ephemeral summary. A pending confirmation is better than asking the model to remember which action is sensitive. We also learned to separate a page-scoped WebMCP discovery session from the durable authorization profile and workspace state that should survive it.

## What's next

Next we would add real-time notification delivery, richer seller reputation checks, transport and escrow partners, stronger identity assurance, richer duplicate detection, collaborative board sharing, and signed trade-room invitations. The core safety model would remain: agents prepare and coordinate; verified people authorize commitment.

## Submission links

- Live app: `ADD_DEPLOYED_URL`
- Public repository: `ADD_PUBLIC_REPOSITORY_URL`
- Demo video: `ADD_PUBLIC_YOUTUBE_URL`
