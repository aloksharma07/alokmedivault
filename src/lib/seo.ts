export function pageHead(title: string, description: string) {
  const brandedTitle = `${title} | MediVault`;
  return {
    meta: [
      { title: brandedTitle },
      { name: "description", content: description },
      { property: "og:title", content: brandedTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}