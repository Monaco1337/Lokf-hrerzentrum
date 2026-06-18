/**
 * Renders one or more JSON-LD nodes as a single <script type="application/ld+json">.
 * Server component — no client JS shipped. The `<` escape prevents any chance of
 * breaking out of the script context.
 */
import type { JsonLdNode } from "../seo";

interface JsonLdProps {
  data: JsonLdNode | JsonLdNode[];
}

export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];
  const json = JSON.stringify(payload.length === 1 ? payload[0] : payload).replace(
    /</g,
    "\\u003c",
  );
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
