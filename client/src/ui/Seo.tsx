import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
};

const siteName = "Save The Gate";
const defaultDescription = "Fan-run Stargate campaign tracking petitions, contacts, updates, fan voices, and community action.";

const setMeta = (name: string, content: string, attribute: "name" | "property" = "name") => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
};

const setCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
};

export const Seo = ({ title, description, path, image, noindex = false }: SeoProps) => {
  useEffect(() => {
    const fullTitle = title === siteName ? siteName : `${title} | ${siteName}`;
    const cleanDescription = description || defaultDescription;
    const origin = window.location.origin;
    const url = `${origin}${path ?? window.location.pathname}`;
    const imageUrl = image ? new URL(image, origin).toString() : "";

    document.title = fullTitle;
    setMeta("description", cleanDescription);
    setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");
    setMeta("og:site_name", siteName, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", cleanDescription, "property");
    setMeta("og:url", url, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", cleanDescription);
    if (imageUrl) {
      setMeta("og:image", imageUrl, "property");
      setMeta("twitter:image", imageUrl);
    }
    setCanonical(url);
  }, [description, image, noindex, path, title]);

  return null;
};
