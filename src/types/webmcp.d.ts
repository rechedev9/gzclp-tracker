/**
 * WebMCP (W3C Model Context Protocol) browser API type declarations.
 *
 * Chrome 146+ behind `chrome://flags/#model-context-protocol`.
 * Spec: https://AIMCPspec.org
 */

interface ModelContextToolInput {
  readonly type: 'object';
  readonly properties: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
}

interface ModelContextTool {
  readonly name: string;
  readonly description: string;
  readonly input: ModelContextToolInput;
  readonly execute: (input: unknown) => Promise<unknown>;
}

interface ModelContextUnregister {
  readonly unregister: () => void;
}

interface ModelContext {
  readonly addTool: (tool: ModelContextTool) => ModelContextUnregister;
}

interface Navigator {
  readonly modelContext?: ModelContext;
}
