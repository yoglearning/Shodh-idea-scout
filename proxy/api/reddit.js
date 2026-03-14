export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "MethodNotAllowed" });
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  if (!targetUrl.startsWith("https://www.reddit.com/")) {
    return res.status(400).json({ error: "Only www.reddit.com URLs are allowed" });
  }

  const USER_AGENT = process.env.REDDIT_USER_AGENT || "ShodhIdeaScoutProxy/1.0 (+https://github.com/yoglearning/Shodh-idea-scout)";

  try {
    const redditResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    const body = await redditResponse.text();
    const contentType = redditResponse.headers.get("content-type") || "application/json";

    res.status(redditResponse.status);
    res.setHeader("Content-Type", contentType);
    return res.send(body);
  } catch (error) {
    console.error("Reddit proxy error", error);
    return res.status(500).json({ error: "ProxyError", message: error.message });
  }
}
