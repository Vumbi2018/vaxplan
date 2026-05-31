import { useEffect } from "react";

interface PageHeadProps {
  /** Full document title shown in browser tabs and search results. */
  title: string;
  /** Meta description for search engines and link previews. */
  description?: string;
  /** Open Graph type (defaults to "website"). */
  ogType?: string;
  /** Canonical/share URL. Defaults to the current location at mount time. */
  url?: string;
  /** Absolute or root-relative image URL for social card previews. */
  image?: string;
}

const DEFAULT_TITLE = "VaxPlan · Health Microplanning for Ministries";

/** Default branded social card shipped in client/public. */
const DEFAULT_IMAGE = "/og-card.png";

/**
 * Resolve a root-relative or absolute image path to a fully-qualified URL.
 * Social crawlers (Slack, X, WhatsApp, LinkedIn) require absolute og:image
 * URLs, so a bare "/og-card.png" must be prefixed with the current origin.
 */
function toAbsoluteUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

function upsertMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !el;
  const previous = el?.getAttribute("content") ?? null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return () => {
    if (!el) return;
    if (created) {
      el.remove();
    } else if (previous !== null) {
      el.setAttribute("content", previous);
    }
  };
}

/**
 * Lightweight, dependency-free document head manager. Imperatively sets the
 * document title plus standard meta description and Open Graph / Twitter card
 * tags while the owning component is mounted, then restores the prior values on
 * unmount. Safe to reuse across any public route (landing, signup, data
 * sources) so shared links render a clean, descriptive preview.
 */
export function PageHead({
  title,
  description,
  ogType = "website",
  url,
  image,
}: PageHeadProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const resolvedUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : undefined);

    const cleanups: Array<() => void> = [];

    if (description) {
      cleanups.push(
        upsertMeta(
          'meta[name="description"]',
          "name",
          "description",
          description,
        ),
      );
    }

    cleanups.push(
      upsertMeta('meta[property="og:title"]', "property", "og:title", title),
    );
    cleanups.push(
      upsertMeta('meta[property="og:type"]', "property", "og:type", ogType),
    );
    cleanups.push(
      upsertMeta(
        'meta[name="twitter:card"]',
        "name",
        "twitter:card",
        "summary_large_image",
      ),
    );
    cleanups.push(
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title),
    );

    if (description) {
      cleanups.push(
        upsertMeta(
          'meta[property="og:description"]',
          "property",
          "og:description",
          description,
        ),
      );
      cleanups.push(
        upsertMeta(
          'meta[name="twitter:description"]',
          "name",
          "twitter:description",
          description,
        ),
      );
    }

    if (resolvedUrl) {
      cleanups.push(
        upsertMeta('meta[property="og:url"]', "property", "og:url", resolvedUrl),
      );
    }

    const resolvedImage = toAbsoluteUrl(image ?? DEFAULT_IMAGE);
    cleanups.push(
      upsertMeta(
        'meta[property="og:image"]',
        "property",
        "og:image",
        resolvedImage,
      ),
    );
    cleanups.push(
      upsertMeta(
        'meta[name="twitter:image"]',
        "name",
        "twitter:image",
        resolvedImage,
      ),
    );

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      cleanups.forEach((restore) => restore());
    };
  }, [title, description, ogType, url, image]);

  return null;
}
