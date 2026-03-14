import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 8000;
const USER_AGENT = process.env.REDDIT_USER_AGENT || "ShodhIdeaScoutProxy/1.0 (+https://github.com/yoglearning/Shodh-idea-scout)";

const allowCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

app.use((req, res, next) => {
  allowCors(res);
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.get("/api/reddit", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  if (!targetUrl.startsWith("https://www.reddit.com/")) {
    return res.status(400).json({ error: "Only www.reddit.com URLs are allowed" });
  }

  try {
    const redditResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    const body = await redditResponse.text();

    res.status(redditResponse.status);
    const contentType = redditResponse.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    return res.send(body);
  } catch (error) {
    console.error("Reddit proxy error", error);
    return res.status(500).json({ error: "ProxyError", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Shodh proxy listening on port ${PORT}`);
});
