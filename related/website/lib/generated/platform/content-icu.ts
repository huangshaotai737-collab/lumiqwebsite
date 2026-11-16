// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
/** Structural subset of the FormatJS AST; the parser stays an app dependency. */
type IcuNode = { type: number; value?: string; children?: IcuNode[]; options?: Record<string, { value: IcuNode[] }>; pluralType?: string; offset?: number };
export function icuSignature(nodes: readonly IcuNode[]): string {
  const signature = new Set<string>();
  const visit = (items: readonly IcuNode[]) => {
    for (const node of items) {
      if (node.type === 8) {
        if (!['strong', 'em', 'privacy'].includes(node.value ?? '')) throw new Error('Unsupported rich text tag');
        signature.add(`tag:${node.value}`);
      } else if (node.type !== 0 && node.type !== 7) {
        signature.add(`${node.type}:${node.value}:${node.pluralType ?? ''}:${node.offset ?? ''}:${Object.keys(node.options ?? {}).sort().join(',')}`);
      }
      if (node.children) visit(node.children);
      for (const option of Object.values(node.options ?? {})) visit(option.value);
    }
  };
  visit(nodes);
  return [...signature].sort().join('|');
}
