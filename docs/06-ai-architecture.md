# AI architecture

The working copilot routes supported questions to approved, scoped calculations. It supports account summaries, risk, quiet accounts, revenue, rep activity, next actions, historical metric attribution and Signals. Unsupported intents fail closed. No generated SQL or model-selected tools exist.

```mermaid
sequenceDiagram
  actor U as User
  participant API as Session and authorization
  participant S as Semantic queries
  participant P as Optional server provider
  participant L as Request log
  U->>API: Question and optional narration request
  API->>S: Scoped dataset
  S-->>API: Computed facts, logic, source IDs, limitations
  opt Configured server narration and daily budget available
    API->>P: Bounded computed evidence; no tools
    P-->>API: JSON narrative and citation IDs
    API->>API: Validate shape, IDs, numerical tokens, deadline
  end
  API->>L: Metadata only, no prompt or secret
  API-->>U: Computed facts plus separately labeled narrative/fallback
```

`NarrativeProvider` is the provider-neutral interface. `narrative.server.ts` implements the OpenAI-compatible chat-completions protocol and is imported exclusively by the server API. Configure server bindings `AI_ENDPOINT`, `AI_MODEL`, `AI_API_KEY`; enable the copilot narration checkbox. The endpoint is administrator configuration, HTTPS only, without credentials/query/hash, with redirects rejected. No browser supplies endpoint or credentials. Compatible gateways can support other vendors; a native Anthropic adapter is not implemented.

Calls have an eight-second deadline, a 64 KB response ceiling, 700 output-token limit, no tools and an atomic 20-attempt daily workspace budget. JSON shape, citation membership and numerical tokens are checked. Failures, missing configuration, insufficient evidence and budget exhaustion retain the deterministic answer. Request logs retain status/provider/count/duration and safe failure categories, not prompts, keys or response text.

These checks do **not** establish semantic truth. A model can make an unsupported qualitative claim using valid citations. Users must review the separately labeled narrative against the computed facts. Record text is untrusted; prompts are not the security boundary. The absence of tools, write authority and unrestricted database access is the stronger control.

The GitHub Pages build never imports the server adapter or reads API secrets. Core features need no key. Automated tests use deterministic provider fixtures; no paid/live model call was made during authoring because no provider credentials were configured.

Protocol reference: [official Chat Completions API](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Provider model support for JSON mode varies; incompatible responses safely fall back.
