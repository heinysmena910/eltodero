// VERSIÓN DE DIAGNÓSTICO — con mensajes en cada paso para encontrar dónde falla

exports.handler = async function (event) {
  console.log("PASO 1: Función iniciada. Método:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    console.log("PASO 1b: Método rechazado (no es POST)");
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  console.log("PASO 2: Verificando si existe la API key...");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("PASO 2 FALLÓ: No hay API key en las variables de entorno");
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Falta configurar ANTHROPIC_API_KEY en Netlify" }),
    };
  }
  console.log("PASO 2 OK: API key encontrada, longitud:", apiKey.length, "primeros caracteres:", apiKey.substring(0, 12));

  try {
    console.log("PASO 3: Parseando el body de la petición...");
    const body = JSON.parse(event.body);
    console.log("PASO 3 OK: Body parseado. Modelo solicitado:", body.model);

    console.log("PASO 4: Llamando a api.anthropic.com...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // corta a los 25s, antes del límite de Netlify

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-5-20250929",
        max_tokens: body.max_tokens || 1500,
        messages: body.messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("PASO 4 OK: Respuesta recibida de Anthropic. Status:", response.status);

    const data = await response.json();
    console.log("PASO 5: Respuesta convertida a JSON correctamente");

    if (!response.ok) {
      console.log("PASO 5b: Anthropic devolvió un error:", JSON.stringify(data));
    }

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.log("ERROR CAPTURADO:", error.name, "-", error.message);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error en el servidor: " + error.message, tipo: error.name }),
    };
  }
};
