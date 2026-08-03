import ReactMarkdown from "react-markdown";

type PostBodyProps = {
  content: string;
};

/**
 * Renders a post's markdown body (paragraphs, bold/italic, headings, lists,
 * links, blockquotes and images added from the CMS media library).
 * Visuals live in .prose-ellen-body (globals.css) and are mirrored by the
 * CMS preview styles in public/admin/preview.css.
 */
export function PostBody({ content }: PostBodyProps) {
  return (
    <div className="prose-ellen-body">
      <ReactMarkdown
        components={{
          img: ({ src, alt }) => (
            // Plain <img>: body images are editor uploads with unknown
            // dimensions, so next/image sizing isn't practical here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
            />
          ),
          a: ({ href, children }) => {
            const isExternal = typeof href === "string" && /^https?:/.test(href);
            return (
              <a
                href={href}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
