// -------- ESTADO GLOBAL --------
let state = JSON.parse(localStorage.getItem("gpt-state")) || {
    currentId: null,
    history: []
};

const ws = new WebSocket("ws://localhost:8765");

let socketReady = false;

ws.onopen = () => {
    console.log("🟢 SOCKET CONECTADO AL BRAIN");
    socketReady = true;
};

ws.onclose = () => {
    console.log("🔴 SOCKET CERRADO");
    socketReady = false;
};

ws.onerror = (e) => {
    console.log("❌ SOCKET ERROR", e);
    socketReady = false;
};

// enviar al cerebro
function sendBrain(intensity = 1) {
    if (socketReady && ws.readyState === 1) {
        ws.send(String(intensity));
    }
}

// -------- ICONOS --------
lucide.createIcons();

// -------- DOM --------
const chatWindow = document.getElementById("chat-window");
const historyCont = document.getElementById("chat-history");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// -------- CACHE --------
function saveState() {
    localStorage.setItem("gpt-state", JSON.stringify(state));
}

// -------- ESCAPE HTML --------
function escapeHtml(text = "") {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// -------- FORMAT CODE --------
function formatMessage(text = "") {
    if (!text) return "";

    text = escapeHtml(text);

    text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
        return `<pre class="code-block"><code>${code}</code></pre>`;
    });

    return text.replace(/\n/g, "<br>");
}

// -------- THINKING UI --------
function showTyping() {
    removeTyping();

    const loader = document.createElement("div");
    loader.id = "typing-loader";
    loader.className = "typing-indicator";

    loader.innerHTML = `
        <span></span><span></span><span></span>
        <div class="thinking-text">pensando...</div>
    `;

    chatWindow.appendChild(loader);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTyping() {
    const loader = document.getElementById("typing-loader");
    if (loader) loader.remove();
}

// -------- TYPEWRITER --------
async function typeWriter(text, el) {
    el.innerHTML = "";

    const words = text.split(" ");

    for (let w of words) {
        el.innerHTML += w + " ";
        chatWindow.scrollTop = chatWindow.scrollHeight;
        await new Promise(r => setTimeout(r, 12));
    }
}

// -------- SEND MESSAGE --------
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    const model = document.getElementById("model-selector").value;

    // crear chat si no existe
    if (!state.currentId) {
        state.currentId = Date.now();

        state.history.unshift({
            id: state.currentId,
            title: text.slice(0, 25) + "...",
            messages: []
        });

        document.getElementById("view-home").classList.remove("active");
        document.getElementById("view-chat").classList.add("active");
    }

    const chat = state.history.find(c => c.id === state.currentId);
    if (!chat) return;

    chat.messages.push({ role: "user", text });

    userInput.value = "";
    userInput.style.height = "auto";

    renderMessages();
    renderHistory();

    showTyping();

    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer INSERTA TU API KEY AQUI",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
                "X-Title": "17-GPT"
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: text }]
            })
        });

        const data = await res.json();
        removeTyping();

        if (!res.ok) throw new Error(data.error?.message || "Error OpenRouter");

        const reply = data.choices?.[0]?.message?.content || "sin respuesta";

        const msg = document.createElement("div");
        msg.className = "message ai";

        const content = document.createElement("div");
        content.className = "content";

        msg.appendChild(content);
        chatWindow.appendChild(msg);

        await typeWriter(reply, content);

        chat.messages.push({ role: "ai", text: reply });
        sendBrain(1);
        saveState();

    } catch (err) {
        removeTyping();

        chatWindow.innerHTML += `
            <div class="message ai">
                <div class="content" style="color:red;">
                    ⚠️ ${err.message}
                </div>
            </div>
        `;
    }
}

// -------- RENDER MESSAGES (SIN BOTONES, LIMPIO) --------
function renderMessages() {
    const chat = state.history.find(c => c.id === state.currentId);
    if (!chat) return;

    chatWindow.innerHTML = chat.messages.map(m => `
        <div class="message ${m.role}">
            <div class="content">${formatMessage(m.text)}</div>
        </div>
    `).join("");

    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// -------- HISTORY --------
function renderHistory() {
    historyCont.innerHTML = state.history.map(chat => `
        <div class="h-item ${chat.id === state.currentId ? "active" : ""}">
            <span onclick="switchChat(${chat.id})">${chat.title}</span>
            <i data-lucide="trash-2" onclick="deleteChat(${chat.id}, event)"></i>
        </div>
    `).join("");

    lucide.createIcons();
}

// -------- SWITCH CHAT --------
function switchChat(id) {
    state.currentId = id;
    saveState();

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-chat").classList.add("active");

    renderMessages();
    renderHistory();
}

// -------- DELETE CHAT --------
function deleteChat(id, e) {
    e.stopPropagation();

    state.history = state.history.filter(c => c.id !== id);

    if (state.currentId === id) {
        state.currentId = state.history[0]?.id || null;
    }

    saveState();
    renderHistory();
    renderMessages();
}

// -------- NEW CHAT --------
function createNewChat() {
    state.currentId = null;
    saveState();

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-home").classList.add("active");

    chatWindow.innerHTML = "";
    renderHistory();
}

// -------- SETTINGS --------
function toggleSettings() {
    document.getElementById("modal-settings").classList.toggle("active");
}

// -------- CLEAR ALL --------
function clearAll() {
    if (confirm("¿Borrar todo?")) {
        localStorage.removeItem("gpt-state");

        state = { currentId: null, history: [] };

        chatWindow.innerHTML = "";
        createNewChat();
        renderHistory();

        toggleSettings();
    }
}

// -------- QUICK ACTION --------
function quickAction(t) {
    userInput.value = t;
    handleSend();
}

// -------- INPUT AUTO HEIGHT --------
userInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
});

// -------- ENTER SEND --------
userInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// -------- SEND BUTTON --------
sendBtn.addEventListener("click", handleSend);

// -------- INIT --------
renderHistory();

if (state.currentId) {
    document.getElementById("view-home").classList.remove("active");
    document.getElementById("view-chat").classList.add("active");
    renderMessages();
}