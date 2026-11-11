/**
 * A script that runs while the server HTML is being parsed, before first paint.
 *
 * Sent as markup inside a hidden element rather than as a React `<script>`: a
 * page load parses and runs it, while a client-side navigation, which renders
 * the course page in the browser, only inserts it as markup, where it neither
 * runs nor makes React warn. There, the settings menu applies the settings.
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <div
      hidden
      // biome-ignore lint/security/noDangerouslySetInnerHtml: our own settings script, with no user input in it
      dangerouslySetInnerHTML={{ __html: `<script>${html}</script>` }}
    />
  );
}
