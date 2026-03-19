let currentChat = null
let isLoading = false

// ============================
// SIDEBAR MÓVIL
// ============================

function initSidebar() {
    const toggle = document.querySelector(".sidebar-toggle")
    const sidebar = document.querySelector(".sidebar")
    const overlay = document.querySelector(".sidebar-overlay")

    if (!toggle || !sidebar || !overlay) return

    toggle.addEventListener("click", () => {
        sidebar.classList.toggle("open")
        overlay.classList.toggle("active")
    })

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open")
        overlay.classList.remove("active")
    })
}

function closeSidebar() {
    const sidebar = document.querySelector(".sidebar")
    const overlay = document.querySelector(".sidebar-overlay")

    if (sidebar) sidebar.classList.remove("open")
    if (overlay) overlay.classList.remove("active")
}


// ============================
// ENVIAR MENSAJE
// ============================

function sendMessage() {
    if (isLoading) return

    const input = document.getElementById("topic")
    const topic = input.value.trim()
    const chat = document.getElementById("chat")

    if (!topic) return

    isLoading = true
    input.value = ""
    input.focus()

    // Mensaje usuario
    appendMessage(chat, topic, "user")
    chat.scrollTop = chat.scrollHeight

    // Loader
    const loading = document.createElement("div")
    loading.className = "message ai loading"
    loading.innerHTML = `<span class="dots">Pensando<span>.</span><span>.</span><span>.</span></span>`
    chat.appendChild(loading)
    chat.scrollTop = chat.scrollHeight

    fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, chat_id: currentChat })
        })
        .then(res => {
            if (!res.ok) throw new Error("Error del servidor")
            return res.json()
        })
        .then(data => {
            loading.remove()
            appendMessage(chat, data.result, "ai")
            chat.scrollTop = chat.scrollHeight
            loadChats()
        })
        .catch(err => {
            loading.remove()
            appendMessage(chat, "⚠️ Ocurrió un error. Intenta de nuevo.", "ai error")
            console.error(err)
        })
        .finally(() => {
            isLoading = false
        })
}


// ============================
// CREAR NUEVO CHAT
// ============================

function newChat() {
    fetch("/new_chat")
        .then(res => res.json())
        .then(data => {
            currentChat = data.chat_id
            document.getElementById("chat").innerHTML = ""
            loadChats()
            closeSidebar()
        })
        .catch(err => console.error("Error al crear chat:", err))
}


// ============================
// CARGAR LISTA DE CHATS
// ============================

function loadChats() {
    fetch("/get_chats")
        .then(res => res.json())
        .then(data => {
            const history = document.getElementById("history")
            history.innerHTML = ""

            if (data.length === 0) {
                history.innerHTML = `<p style="font-size:12px;opacity:0.4;text-align:center;margin-top:10px;">Sin chats aún</p>`
                return
            }

            data.forEach(chat => {
                const div = document.createElement("div")
                div.className = "history-item"
                if (chat.id === currentChat) div.classList.add("active")
                div.innerText = chat.title || "Chat sin título"
                div.onclick = () => openChat(chat.id)
                history.appendChild(div)
            })
        })
        .catch(err => console.error("Error al cargar chats:", err))
}


// ============================
// ABRIR CHAT ANTIGUO
// ============================

function openChat(chatId) {
    currentChat = chatId

    fetch("/get_messages/" + chatId)
        .then(res => res.json())
        .then(data => {
            const chat = document.getElementById("chat")
            chat.innerHTML = ""

            data.forEach(msg => {
                appendMessage(chat, msg.content, msg.role === "user" ? "user" : "ai")
            })

            chat.scrollTop = chat.scrollHeight
            loadChats()
            closeSidebar()
        })
        .catch(err => console.error("Error al abrir chat:", err))
}


// ============================
// HELPER: CREAR MENSAJE
// ============================

function appendMessage(container, text, type) {
    const div = document.createElement("div")
    div.className = `message ${type}`
    div.innerText = text
    container.appendChild(div)
    return div
}


// ============================
// ENTER PARA ENVIAR
// ============================

function initInputListener() {
    const input = document.getElementById("topic")
    if (!input) return

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    })
}


// ============================
// INICIAR TODO
// ============================

window.onload = function() {
    initSidebar()
    initInputListener()
    loadChats()
    newChat()
}