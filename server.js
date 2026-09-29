const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile();
const port = process.env.PORT || 3000;

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function getAdvice(weather) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("The server is missing GEMINI_API_KEY.");

  const prompt = `Give only one friendly, practical outdoor recommendation in 1-2 short sentences. The user can already see the city, temperature, weather icon, humidity, and wind speed, so do not repeat, summarize, or describe those conditions. Focus on what they should bring, wear, do, or avoid. Do not mention that you are an AI. Do not give medical advice.\n\nCity: ${weather.city}\nCondition: ${weather.condition}\nTemperature: ${weather.temperature} C\nHumidity: ${weather.humidity}%\nWind speed: ${weather.windSpeed} km/h`;
  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 100, temperature: 0.4 }
    })
  });
  const result = await geminiResponse.json();
  if (!geminiResponse.ok) throw new Error(result.error?.message || "Gemini request failed.");

  const advice = result.candidates?.[0]?.content?.parts?.map(part => part.text || "").join(" ").trim();
  if (!advice) throw new Error("Gemini returned no advice.");
  return advice;
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/weather-advice") {
    let rawBody = "";
    request.on("data", chunk => {
      rawBody += chunk;
      if (rawBody.length > 10_000) request.destroy();
    });
    request.on("end", async () => {
      try {
        const weather = JSON.parse(rawBody);
        if (!weather.city || !weather.condition) return sendJson(response, 400, { error: "Weather details are required." });
        const advice = await getAdvice(weather);
        sendJson(response, 200, { advice });
      } catch (error) {
        console.error(error.message);
        sendJson(response, 500, { error: "Unable to generate weather advice." });
      }
    });
    return;
  }

  const filePath = request.url === "/" ? path.join(root, "index.html") : path.join(root, request.url);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    return response.end("Not found");
  }
  const contentType = filePath.endsWith(".css") ? "text/css" : filePath.endsWith(".png") ? "image/png" : "text/html";
  response.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, () => console.log(`Weather app running at http://localhost:${port}`));
