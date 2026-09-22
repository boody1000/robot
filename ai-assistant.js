/**
 * ai-assistant.js
 * ------------------------------------------------------------
 * روبوت المساعدة الصوتي العائم (يعمل بالكامل من متصفح المستخدم)
 * ------------------------------------------------------------
 */
const RW_CONFIG = {
  avatarUrl: "https://api.iconify.design/fluent-emoji/robot.svg",
  lang: "ar-SA",
  greeting: "أهلاً بك في مكتب الهواري! اضغط عليّ وكلمني لو تحتاج مساعدة.",
};

(function () {
  // ---------- بناء عناصر HTML للروبوت ----------
  const container = document.createElement("div");
  container.id = "rw-robot-container";
  container.innerHTML = `
    <div id="rw-bubble"></div>
    <div id="rw-robot" title="اضغط وتكلم مع المساعد">
      <img src="${RW_CONFIG.avatarUrl}" alt="روبوت المساعدة" />
      <div id="rw-mic-badge">🎤</div>
    </div>
    <div id="rw-status">اضغط للتحدث</div>
  `;
  document.body.appendChild(container);

  const robotEl = document.getElementById("rw-robot");
  const bubbleEl = document.getElementById("rw-bubble");
  const statusEl = document.getElementById("rw-status");

  let isBusy = false;

  // ---------- دعم التعرف على الصوت (Speech-to-Text) ----------
  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognizer = null;
  if (SpeechRecognitionAPI) {
    recognizer = new SpeechRecognitionAPI();
    recognizer.lang = RW_CONFIG.lang;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => {
      setState("listening");
      setStatus("بستمع لك... تكلم الآن");
    };

    recognizer.onerror = (e) => {
      setState("idle");
      setStatus("ما قدرت أسمعك، جرّب مرة ثانية");
      console.error("Speech recognition error:", e.error);
    };

    recognizer.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      showBubble(transcript, "user");
      sendToGemini(transcript);
    };

    recognizer.onend = () => {
      if (!isBusy) setState("idle");
    };
  } else {
    statusEl.textContent = "المتصفح لا يدعم الصوت";
  }

  // ---------- نطق الرد (Text-to-Speech) ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) {
      setState("idle");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = RW_CONFIG.lang;
    utterance.rate = 1;

    utterance.onstart = () => {
      setState("talking");
      setStatus("يتكلم...");
    };
    utterance.onend = () => {
      setState("idle");
      setStatus("اضغط للتحدث");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  // ---------- الاتصال المباشر بـ Gemini API ----------
  async function sendToGemini(message) {
    isBusy = true;
    setState("thinking");
    setStatus("يفكر...");

    const apiKey = "AQ.Ab8RN6Kss34oUG46LmorS5Cugu54m9Vw_ku3TBQcNBrMkUgCmQ";
    const model = "gemini-1.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ]
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "خطأ في الاتصال أو المصادقة");
      }

      const reply = data.candidates[0].content.parts[0].text;

      showBubble(reply, "assistant");
      speak(reply);
    } catch (err) {
      console.error(err);
      showBubble("عذراً، صار خطأ في الاتصال بالمساعد.", "assistant");
      setState("idle");
      setStatus("حدث خطأ، حاول مرة أخرى");
    } finally {
      isBusy = false;
    }
  }

  // ---------- تفاعل الضغط على الروبوت ----------
  robotEl.addEventListener("click", () => {
    if (!recognizer) return;
    if (isBusy) return;
    window.speechSynthesis.cancel();
    try {
      recognizer.start();
    } catch (e) {}
  });

  // ---------- دوال الواجهة ----------
  function setState(state) {
    robotEl.classList.remove("rw-listening", "rw-talking", "rw-thinking");
    if (state === "listening") robotEl.classList.add("rw-listening");
    if (state === "talking") robotEl.classList.add("rw-talking");
    if (state === "thinking") robotEl.classList.add("rw-thinking");
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function showBubble(text) {
    bubbleEl.textContent = text;
    bubbleEl.classList.add("rw-show");
    clearTimeout(showBubble._timer);
    showBubble._timer = setTimeout(() => {
      bubbleEl.classList.remove("rw-show");
    }, 8000);
  }

  // ---------- الترحيب التلقائي ----------
  if (RW_CONFIG.greeting) {
    setTimeout(() => {
      showBubble(RW_CONFIG.greeting);
      speak(RW_CONFIG.greeting);
    }, 1200);
  }
})();
