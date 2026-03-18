from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from groq import Groq
import sqlite3
import os
from dotenv import load_dotenv

# ===============================
# CONFIGURACIÓN INICIAL
# ===============================

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "nix_secret_key")

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ===============================
# BASE DE DATOS
# ===============================

def get_db():
    return sqlite3.connect("users.db")

def init_db():

    conn = get_db()
    cursor = conn.cursor()

    # usuarios
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT
    )
    """)

    # chats
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chats(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        title TEXT
    )
    """)

    # mensajes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        role TEXT,
        content TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()

# ===============================
# RUTAS
# ===============================

@app.route("/")
def home():

    if "user" not in session:
        return redirect(url_for("login"))

    return render_template("index.html")

@app.route("/login")
def login():

    if "user" in session:
        return redirect(url_for("home"))

    return render_template("login.html")

@app.route("/register")
def register():
    return render_template("register.html")

@app.route("/register_user", methods=["POST"])
def register_user():

    email = request.form["email"]
    password = request.form["password"]

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (email, password) VALUES (?,?)",
            (email, password)
        )
        conn.commit()

        flash("Cuenta creada con éxito ✅")
        return redirect(url_for("login"))

    except:
        flash("Ese correo ya está registrado ⚠️")
        return redirect(url_for("register"))

    finally:
        conn.close()

@app.route("/login_user", methods=["POST"])
def login_user():

    email = request.form["email"]
    password = request.form["password"]

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM users WHERE email=? AND password=?",
        (email, password)
    )

    user = cursor.fetchone()
    conn.close()

    if user:
        session["user"] = email
        flash("Inicio de sesión con éxito ✅")
        return redirect(url_for("home"))
    else:
        flash("Correo o contraseña incorrectos ❌")
        return redirect(url_for("login"))

@app.route("/panel")
def panel():

    if "user" not in session:
        return redirect(url_for("login"))

    return render_template("panel.html", user=session["user"])

@app.route("/logout")
def logout():

    session.pop("user", None)
    flash("Sesión cerrada correctamente")
    return redirect(url_for("login"))

@app.route("/new_chat")
def new_chat():

    if "user" not in session:
        return jsonify({"error":"no session"})

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO chats (user_email, title) VALUES (?,?)",
        (session["user"], "Nuevo Chat")
    )

    conn.commit()
    chat_id = cursor.lastrowid
    conn.close()

    return jsonify({"chat_id": chat_id})

@app.route("/get_chats")
def get_chats():

    if "user" not in session:
        return jsonify([])

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, title FROM chats WHERE user_email=? ORDER BY id DESC",
        (session["user"],)
    )

    chats = cursor.fetchall()
    conn.close()

    return [{"id": c[0], "title": c[1]} for c in chats]

@app.route("/get_messages/<int:chat_id>")
def get_messages(chat_id):

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT role, content FROM messages WHERE chat_id=?",
        (chat_id,)
    )

    rows = cursor.fetchall()
    conn.close()

    return [{"role": r[0], "content": r[1]} for r in rows]

@app.route("/generate", methods=["POST"])
def generate():

    if "user" not in session:
        return jsonify({"result":"Debes iniciar sesión."})

    data = request.json
    topic = data["topic"]
    chat_id = data["chat_id"]

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT role, content FROM messages WHERE chat_id=?",
        (chat_id,)
    )

    rows = cursor.fetchall()

    messages = [
        {
            "role":"system",
            "content":"Eres N.I.X, un asistente inteligente y profesional. Responde siempre en español."
        }
    ]

    for r in rows:
        messages.append({
            "role": r[0],
            "content": r[1]
        })

    messages.append({
        "role":"user",
        "content":topic
    })

    chat_completion = client.chat.completions.create(
        messages=messages,
        model="llama-3.1-8b-instant"
    )

    text = chat_completion.choices[0].message.content

    # guardar mensaje usuario
    cursor.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)",
        (chat_id,"user",topic)
    )

    # guardar respuesta IA
    cursor.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)",
        (chat_id,"assistant",text)
    )

    conn.commit()
    conn.close()

    return jsonify({"result":text})

# ===============================
# RUN
# ===============================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)