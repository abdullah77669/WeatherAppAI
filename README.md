# Weather AI Advice (Gemini free tier)

The page now asks a server endpoint for a short AI suggestion after the weather API responds.

## Run it

Use Node.js 18 or newer. Create a Gemini key in [Google AI Studio](https://aistudio.google.com/app/apikey), then create a `.env` file in this project folder:

```text
GEMINI_API_KEY=your_gemini_api_key
```

`API_KEY=your_gemini_api_key` is also accepted for compatibility, but `GEMINI_API_KEY` is the recommended name.

Then run `node server.js` and open `http://localhost:3000` in your browser. Do not open `index.html` directly: the AI endpoint needs the local server.

The app uses `gemini-3.5-flash-lite`. Optionally set `GEMINI_MODEL` before starting to use a different Gemini model.
