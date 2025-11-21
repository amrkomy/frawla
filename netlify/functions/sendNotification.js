// netlify/functions/sendNotification.js

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
    console.error("❌ Missing OneSignal environment variables");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server misconfiguration" }),
    };
  }

  try {
    const { title, message, imageUrl } = JSON.parse(event.body || "{}");

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"], // 📢 إرسال لكل المشتركين
      headings: { en: title || "إشعار جديد" },
      contents: { en: message || "لا يوجد محتوى" },
      chrome_web_image: imageUrl || undefined,
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    return {
      statusCode: response.ok ? 200 : 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("❌ Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
