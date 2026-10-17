/** Wraps community-submitted content in tags to mark it as untrusted data for LLMs. */
export function wrapUntrustedData(kind: string, data: unknown): string {
  const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return `<untrusted_community_data type="${kind}">\n${content}\n</untrusted_community_data>`;
}
