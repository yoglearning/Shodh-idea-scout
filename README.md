# Shodh - Challenge Engine

Shodh is a powerful idea-generation and validation tool that helps you discover real problems, friction points, and recurring complaints directly from Reddit. By analyzing discussions across specific communities, Shodh distills heavy text into actionable product challenges and startup ideas.

## Features

- **Custom Subreddit Sourcing:** Enter any subreddit to instantly pull the most trending or highly debated topics.
- **Friction Detection:** Automatically filters out noise and highlights posts where users are expressing struggles, asking for help, or complaining about issues.
- **Dynamic Fallbacks:** Intelligently falls back to top topics if specific friction keywords aren't found, ensuring you always get actionable data.
- **Time-period Filtering:** Filter discussions by Hot, Today, This Week, This Month, This Year, or All Time.
- **Smart Proxying:** Uses a secure CORS proxy to fetch Reddit data reliably without being blocked by browser policies.
- **Persistent Storage:** Saves your accepted challenges, ideas, and custom subreddit lists locally in your browser.
- **Beautiful Glassmorphism UI:** A modern, distraction-free interface built with vanilla HTML, CSS, and JS.

## Getting Started

Since Shodh is a purely client-side web application, you don't need any complex build tools or servers to run it!

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser.
3. Start exploring subreddits!

## How It Works

1. **Add a Subreddit:** Type a community name (e.g., `startups`, `marketing`, `seo`) into the input field and press Enter.
2. **Fetch Ideas:** The engine will query Reddit's API, proxy the request to bypass CORS restrictions, and filter the results for "friction" keywords.
3. **Accept or Skip:** Review the generated challenges. If you like an idea, click **Accept** to save it to your local list.
4. **Take Notes:** Add notes and expand on your accepted ideas directly within the app.

## Technologies Used
- HTML5
- CSS3 (Vanilla, CSS Variables, Glassmorphism)
- JavaScript (ES6+, Fetch API, LocalStorage)

## Contributing
Feel free to fork this project, submit pull requests, or open issues if you'd like to suggest new features or report bugs!
