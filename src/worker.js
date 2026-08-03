export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/signup" && request.method === "POST") {
        return handleSignup(request, env);
    }
    return new Response("Not found", {status: 404});
  }
};

async function handleSignup(request, env) {
  try {
    const formData = await request.formData();

    const name = formData.get("name");
    const email = formData.get("email");
    const file = formData.get("model");

    // --- basic validation ---
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "Model file is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "Model file too large" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const id = crypto.randomUUID();
    const modelKey = `models/${id}.glb`;

    await env.MODELS_BUCKET.put(modelKey, file.stream(), {
      httpMetadata: { contentType: "model/gltf-binary" }
    });

    await env.DB.prepare(
      "INSERT INTO attendees (id, name, email, model_key) VALUES (?, ?, ?, ?)"
    ).bind(id, name.trim(), email.trim(), modelKey).run();

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Signup failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}