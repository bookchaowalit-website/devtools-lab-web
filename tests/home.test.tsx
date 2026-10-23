import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the sample notebook, the counters and the sample-data notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Observe. Log. Leave a trace.");
    expect(html).toContain("Edge runtime notes");
    expect(html).toContain("Monochrome type study");
    expect(html).toContain("Nothing here is a claim of a running research program.");
    expect(html).toContain("localStorage only");
    expect(html).toContain("2<!-- --> / <!-- -->2<!-- --> observations in view");
  });
});
