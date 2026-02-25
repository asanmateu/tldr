import { defineConfig } from "vitepress";

export default defineConfig({
  title: "tl;dr",
  description:
    "Summarize anything. Understand everything. A CLI built for neurodivergent workflows.",
  base: "/tldr/",

  head: [
    [
      "link",
      {
        rel: "icon",
        href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📖</text></svg>",
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: "Guide", link: "/installation" },
      {
        text: "GitHub",
        link: "https://github.com/asanmateu/tldr",
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Installation", link: "/installation" },
          { text: "Configuration", link: "/configuration" },
          { text: "Providers", link: "/providers" },
          { text: "Audio", link: "/audio" },
          { text: "Use Cases", link: "/use-cases" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/asanmateu/tldr" }],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2026 Antonio San Mateu Erralta",
    },
  },
});
