// تسجيل الـ service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

// Toast utility
const toast = (msg, type = "info") => {
  const t = document.createElement("div");
  t.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
  t.style.zIndex = 1055;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
};

// سجل الإشعارات من localStorage
const historyKey = "notifHistory";
let history = JSON.parse(localStorage.getItem(historyKey) || "[]");

// عرض سجل الإشعارات
const renderHistory = () => {
  const box = document.getElementById("historyBox");
  if (!history.length) {
    box.innerHTML = '<p class="text-muted text-center py-3">لا توجد إشعارات بعد</p>';
    return;
  }
  box.innerHTML = history
    .map(({ time, title, body }) =>
      `<div class="list-group-item">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${title}</h6>
          <small>${new Date(time).toLocaleString("ar-EG")}</small>
        </div>
        <p class="mb-1">${body}</p>
      </div>`
    )
    .join("");
};
renderHistory();

// === معاينة الصورة ===
const imagePreview = document.getElementById("imagePreview"); // 👈 تم تعريفه الآن

document.getElementById("imageFile").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) {
    imagePreview.classList.add("d-none");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    imagePreview.classList.remove("d-none");
  };
  reader.readAsDataURL(file);
});

// === إرسال الإشعار ===
document.getElementById("notifyForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // منع إعادة التحميل (مهم جدًا)

  const btn = e.target.querySelector("button");
  const title = document.getElementById("title").value.trim();
  const message = document.getElementById("message").value.trim();
  const imageFile = document.getElementById("imageFile").files[0];

  // التحقق من الحقول المطلوبة
  if (!title || !message) {
    toast("يرجى ملء العنوان والرسالة", "warning");
    return;
  }

  // تعطيل الزر وعرض مؤشر التحميل
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>جاري الإرسال...`;

  let imageUrl = null;

  // رفع الصورة (إذا وُجدت)
  if (imageFile) {
    const fd = new FormData();
    fd.append("image", imageFile);
    try {
      const res = await fetch("https://api.imgbb.com/1/upload?key=7a2772de77491aa8fb9696a1727062bf", {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (j.success) {
        imageUrl = j.data.url;
      } else {
        toast("⚠️ فشل رفع الصورة. سيتم الإرسال بدونها.", "warning");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      toast("⚠️ حدث خطأ أثناء رفع الصورة", "warning");
    }
  }

  // إرسال الإشعار عبر Netlify Function
  try {
    const resp = await fetch("/.netlify/functions/sendNotification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, imageUrl }),
    });

    const result = await resp.json();

    if (result.id) {
      // حفظ في سجل localStorage
      history.unshift({ time: Date.now(), title, body: message });
      localStorage.setItem(historyKey, JSON.stringify(history));
      renderHistory();

      toast("✅ تم إرسال الإشعار بنجاح", "success");
      e.target.reset();
      imagePreview.classList.add("d-none");
    } else {
      toast("❌ فشل إرسال الإشعار: " + (result.error || "خطأ غير معروف"), "danger");
    }
  } catch (err) {
    console.error("Notification error:", err);
    toast("❌ حدث خطأ أثناء الإرسال", "danger");
  } finally {
    // إعادة تفعيل الزر
    btn.disabled = false;
    btn.innerHTML = "إرسال الإشعار";
  }
});
