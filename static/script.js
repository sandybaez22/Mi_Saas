let currentChat = null

// ============================
// ENVIAR MENSAJE
// ============================

function sendPrompt() {

    let topic = document.getElementById("topic").value
    let chat = document.getElementById("chat")

    if (topic === "") return

    // mensaje usuario

    let userMessage = document.createElement("div")
    userMessage.className = "message user"
    userMessage.innerText = topic

    chat.appendChild(userMessage)

    // loader

    let loading = document.createElement("div")
    loading.className = "message ai loading"
    loading.innerText = "🤖 Pensando..."

    chat.appendChild(loading)

    chat.scrollTop = chat.scrollHeight


    fetch("/generate", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            topic: topic,
            chat_id: currentChat

        })

    })

    .then(res => res.json())

    .then(data => {

        loading.remove()

        let aiMessage = document.createElement("div")

        aiMessage.className = "message ai"

        aiMessage.innerText = data.result

        chat.appendChild(aiMessage)

        chat.scrollTop = chat.scrollHeight

    })

    document.getElementById("topic").value = ""

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

    })

}


// ============================
// CARGAR LISTA DE CHATS
// ============================

function loadChats() {

    fetch("/get_chats")

    .then(res => res.json())

    .then(data => {

        let history = document.getElementById("history")

        history.innerHTML = ""

        data.forEach(chat => {

            let div = document.createElement("div")

            div.className = "history-item"

            div.innerText = chat.title

            div.onclick = function() {

                openChat(chat.id)

            }

            history.appendChild(div)

        })

    })

}


// ============================
// ABRIR CHAT ANTIGUO
// ============================

function openChat(chatId) {

    currentChat = chatId

    fetch("/get_messages/" + chatId)

    .then(res => res.json())

    .then(data => {

        let chat = document.getElementById("chat")

        chat.innerHTML = ""

        data.forEach(msg => {

            let div = document.createElement("div")

            if (msg.role === "user") {

                div.className = "message user"

            } else {

                div.className = "message ai"

            }

            div.innerText = msg.content

            chat.appendChild(div)

        })

        chat.scrollTop = chat.scrollHeight

    })

}


// ============================
// INICIAR TODO
// ============================

window.onload = function() {

    loadChats()

    newChat()

}