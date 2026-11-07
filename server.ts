import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API Route for Link Preview
  app.get("/api/link-preview", async (req, res) => {
    const urlStr = req.query.url as string;
    if (!urlStr) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    try {
      let targetUrl = urlStr;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
      }
      
      const parsedUrl = new URL(targetUrl);
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        },
        signal: AbortSignal.timeout(6000) // 6s timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const html = await response.text();

      // Simple robust regex search for meta elements
      const getMeta = (propertyOrName: string): string => {
        // match: property="og:title" content="value"
        const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["']`, 'i');
        // match: content="value" property="og:title"
        const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["']`, 'i');
        
        const m1 = html.match(regex1);
        if (m1) return m1[1];
        const m2 = html.match(regex2);
        if (m2) return m2[1];
        return "";
      };

      let title = getMeta("og:title") || getMeta("twitter:title");
      if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1] : parsedUrl.hostname;
      }

      const description = getMeta("og:description") || getMeta("description") || getMeta("twitter:description") || "پیش‌نمایش در دسترس نیست";
      const image = getMeta("og:image") || getMeta("twitter:image") || "";

      // Decode simple HTML entities if any
      const cleanText = (str: string) => {
        return str
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");
      };

      res.json({
        title: cleanText(title).trim(),
        description: cleanText(description).trim(),
        image: image.trim(),
        url: targetUrl
      });
    } catch (error: any) {
      console.error("Link preview fetch error:", error.message);
      try {
        const fallbackUrl = new URL(urlStr);
        res.json({
          title: fallbackUrl.hostname,
          description: "پیش‌نمایش در دسترس نیست",
          image: "",
          url: urlStr
        });
      } catch {
        res.json({
          title: urlStr,
          description: "پیش‌نمایش در دسترس نیست",
          image: "",
          url: urlStr
        });
      }
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
