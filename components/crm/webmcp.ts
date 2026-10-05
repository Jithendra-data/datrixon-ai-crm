import { useEffect } from "react";
type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useWorkspaceTool(
  summary: {
    pipeline: number;
    weighted: number;
    accounts: number;
    role: string;
  } | null,
) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context || !summary) return;
    const controller = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "read_visible_crm_summary",
            description:
              "Read the currently displayed scoped CRM totals. Amounts are USD cents; synthetic reference data only.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== "object" ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object");
              return { ...summary, synthetic: true, method: "deterministic" };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {
        /* Optional browser capability; ordinary UI remains available. */
      });
    } catch {
      /* Unsupported browser capability does not affect CRM. */
    }
    return () => controller.abort();
  }, [summary]);
}
