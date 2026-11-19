import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import nextConfig from "@/next.config";

describe("home page", () => {
  it("renders the sample notebook, the state lists and the sample-data notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("All experiments");
    expect(html).toContain("Edge runtime notes");
    expect(html).toContain("Monochrome type study");
    expect(html).toContain("not a running research programme");
    expect(html).toContain("Saved in this browser only");
    expect(html).toContain("Logged <time");
    expect(html).toContain('href="https://bookchaowalit.com/"');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });
});

describe("site config", () => {
  it("redirects /more-projects to the hub and publishes sitemap and robots on its own domain", async () => {
    expect(await nextConfig.redirects!()).toContainEqual({ source: "/more-projects", destination: "https://bookchaowalit.com/", permanent: true });
    expect(sitemap()[0].url).toBe("https://lab.bookchaowalit.com/");
    expect(robots().sitemap).toBe("https://lab.bookchaowalit.com/sitemap.xml");
  });
});
