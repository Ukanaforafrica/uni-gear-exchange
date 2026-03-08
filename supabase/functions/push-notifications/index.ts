import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Generate VAPID keys using Web Crypto API (ECDSA P-256)
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );

  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  // Convert JWK to URL-safe base64 uncompressed public key
  const x = base64UrlToBytes(publicJwk.x!);
  const y = base64UrlToBytes(publicJwk.y!);
  const publicRaw = new Uint8Array(65);
  publicRaw[0] = 0x04;
  publicRaw.set(x, 1);
  publicRaw.set(y, 33);

  return {
    publicKey: bytesToBase64Url(publicRaw),
    privateKey: publicJwk.d!, // Already base64url
    publicJwk: JSON.stringify(publicJwk),
    privateJwk: JSON.stringify(privateJwk),
  };
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getOrCreateVapidKeys(admin: ReturnType<typeof getSupabaseAdmin>) {
  // Check if keys exist in app_config
  const { data: existing } = await admin
    .from("app_config")
    .select("key, value")
    .in("key", ["vapid_public_key", "vapid_private_jwk", "vapid_public_jwk"]);

  if (existing && existing.length >= 3) {
    const map = Object.fromEntries(existing.map((r: any) => [r.key, r.value]));
    return {
      publicKey: map.vapid_public_key,
      privateJwk: JSON.parse(map.vapid_private_jwk),
      publicJwk: JSON.parse(map.vapid_public_jwk),
    };
  }

  // Generate new keys
  const keys = await generateVapidKeys();
  await admin.from("app_config").upsert([
    { key: "vapid_public_key", value: keys.publicKey },
    { key: "vapid_private_jwk", value: keys.privateJwk },
    { key: "vapid_public_jwk", value: keys.publicJwk },
  ]);

  return {
    publicKey: keys.publicKey,
    privateJwk: JSON.parse(keys.privateJwk),
    publicJwk: JSON.parse(keys.publicJwk),
  };
}

// Send push notification using Web Push protocol
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidKeys: { publicJwk: any; privateJwk: any; publicKey: string }
) {
  try {
    // Import the ECDSA private key for signing
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      { ...vapidKeys.privateJwk, key_ops: ["sign"] },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    // Create VAPID JWT
    const now = Math.floor(Date.now() / 1000);
    const aud = new URL(subscription.endpoint).origin;

    const header = { typ: "JWT", alg: "ES256" };
    const claims = {
      aud,
      exp: now + 3600,
      sub: `mailto:noreply@barndle.com`,
    };

    const headerB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
    const claimsB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
    const unsignedToken = `${headerB64}.${claimsB64}`;

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert DER signature to raw r||s format for JWT
    const sigBytes = new Uint8Array(signature);
    let rawSig: Uint8Array;
    if (sigBytes.length === 64) {
      rawSig = sigBytes;
    } else {
      // Parse DER
      const r = parseDerInt(sigBytes, 3);
      const sOffset = 3 + sigBytes[3] + 2;
      const s = parseDerInt(sigBytes, sOffset);
      rawSig = new Uint8Array(64);
      rawSig.set(padTo32(r), 0);
      rawSig.set(padTo32(s), 32);
    }

    const jwt = `${unsignedToken}.${bytesToBase64Url(rawSig)}`;

    // Encrypt payload using Web Push encryption (aes128gcm)
    const encrypted = await encryptPayload(
      subscription.p256dh,
      subscription.auth,
      new TextEncoder().encode(payload)
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Urgency: "high",
      },
      body: encrypted,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Push failed (${response.status}): ${text}`);
      // If subscription is gone, return status for cleanup
      if (response.status === 404 || response.status === 410) {
        return { gone: true };
      }
    }

    return { ok: response.ok };
  } catch (err) {
    console.error("Push notification error:", err);
    return { error: String(err) };
  }
}

function parseDerInt(buf: Uint8Array, offset: number): Uint8Array {
  const len = buf[offset + 1];
  return buf.slice(offset + 2, offset + 2 + len);
}

function padTo32(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) return bytes.slice(bytes.length - 32);
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

// Web Push payload encryption (aes128gcm)
async function encryptPayload(
  p256dhBase64Url: string,
  authBase64Url: string,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const clientPublicKey = base64UrlToBytes(p256dhBase64Url);
  const authSecret = base64UrlToBytes(authBase64Url);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // HKDF for IKM
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKey.length + localPublicKey.length);
  authInfoFull.set(authInfo, 0);
  authInfoFull.set(clientPublicKey, authInfo.length);
  authInfoFull.set(localPublicKey, authInfo.length + clientPublicKey.length);

  const ikm = await hkdf(authSecret, sharedSecret, authInfoFull, 32);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key and nonce
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad plaintext (add delimiter byte 0x02)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext, 0);
  padded[plaintext.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, padded)
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = plaintext.length + 1 + 16; // record size = padded + tag
  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs + 1, false);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header, 0);
  result.set(encrypted, header.length);

  return result;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), ikm)
  );
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info, 0);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const admin = getSupabaseAdmin();

    // GET /push-notifications?action=vapid-key
    if (req.method === "GET") {
      const action = url.searchParams.get("action");
      if (action === "vapid-key") {
        const keys = await getOrCreateVapidKeys(admin);
        return new Response(JSON.stringify({ publicKey: keys.publicKey }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "subscribe") {
        // Verify auth
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { subscription } = body;
        const keys = subscription.keys;

        await admin.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
          { onConflict: "user_id,endpoint" }
        );

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "send") {
        // Send push to a specific user
        const { recipientId, title, body: notifBody, url: notifUrl } = body;

        if (!recipientId || !title) {
          return new Response(JSON.stringify({ error: "Missing recipientId or title" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const vapidKeys = await getOrCreateVapidKeys(admin);

        // Get all subscriptions for the recipient
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", recipientId);

        if (!subs || subs.length === 0) {
          return new Response(JSON.stringify({ ok: true, sent: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const payload = JSON.stringify({
          title,
          body: notifBody || "",
          url: notifUrl || "/negotiations",
          icon: "/favicon.png",
          badge: "/favicon.png",
        });

        let sent = 0;
        const goneSubs: string[] = [];

        await Promise.all(
          subs.map(async (sub: any) => {
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              payload,
              vapidKeys
            );
            if (result.ok) sent++;
            if ((result as any).gone) goneSubs.push(sub.id);
          })
        );

        // Clean up expired subscriptions
        if (goneSubs.length > 0) {
          await admin.from("push_subscriptions").delete().in("id", goneSubs);
        }

        return new Response(JSON.stringify({ ok: true, sent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "unsubscribe") {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { endpoint } = body;
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
