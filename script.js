import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Selectores de la interfaz
const mainView = document.getElementById('mainView');
const configMode = document.getElementById('configMode');
const btnConfig = document.getElementById('btnConfig');
const btnGuardarConfig = document.getElementById('btnGuardarConfig');
const apiInput = document.getElementById('apiInput');
const btnResolver = document.getElementById('btnResolver');
const textoResultado = document.getElementById('textoResultado');
const resultBox = document.getElementById('resultado');

// --- LÓGICA DE PERSISTENCIA (7 DÍAS) ---

function guardarApiKey(key) {
    const ahora = new Date();
    const item = {
        value: key,
        expiry: ahora.getTime() + (7 * 24 * 60 * 60 * 1000) 
    };
    localStorage.setItem('ludopatas_key_secure', JSON.stringify(item));
}

function obtenerApiKey() {
    const itemStr = localStorage.getItem('ludopatas_key_secure');
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    const ahora = new Date();
    if (ahora.getTime() > item.expiry) {
        localStorage.removeItem('ludopatas_key_secure');
        return null;
    }
    return item.value;
}

// --- NAVEGACIÓN ---

btnConfig.addEventListener('click', () => {
    mainView.style.display = 'none';
    configMode.style.display = 'block';
    const actual = obtenerApiKey();
    if (actual) {
        document.getElementById('statusKey').innerText = "Ya tienes una clave activa. Introduce una nueva para sobrescribirla.";
    }
});

btnGuardarConfig.addEventListener('click', () => {
    const key = apiInput.value.trim();
    if (key) {
        guardarApiKey(key);
        alert("Clave configurada correctamente por 7 días.");
        location.reload(); 
    } else {
        alert("Por favor, introduce una clave válida.");
    }
});

// --- PROCESAMIENTO DE IMÁGENES ---

async function fileToPart(file) {
    const base64 = await new Promise(r => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: base64, mimeType: file.type } };
}

// --- LÓGICA DE RESOLUCIÓN ---

btnResolver.addEventListener('click', async () => {
    const API_KEY = obtenerApiKey();
    if (!API_KEY) return alert("Configura la API Key primero.");

    const promptText = document.getElementById('enunciado').value.trim();
    const file = document.getElementById('foto').files[0];

    btnResolver.disabled = true;
    btnResolver.innerText = "Consultando...";
    resultBox.style.display = 'block';
    textoResultado.innerText = "Pensando...";

    try {
        let parts = [{ text: "Actúa como profesor de física. Resuelve paso a paso. Usa LaTeX ($$):\n" + promptText }];

        if (file) {
            const base64 = await new Promise(r => {
                const reader = new FileReader();
                reader.onload = () => r(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });
            parts.push({ inline_data: { mime_type: file.type, data: base64 } });
        }

        // CAMBIO AQUÍ: Usamos gemini-2.0-flash que está en tu lista (índice 2)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        // Extraemos la respuesta (la estructura de Gemini 2.0 es igual)
        const respuestaIA = data.candidates[0].content.parts[0].text;
        textoResultado.innerHTML = respuestaIA.replace(/\n/g, '<br>');
        
        if (window.MathJax) MathJax.typesetPromise();

    } catch (e) {
        textoResultado.innerText = "Error: " + e.message;
    } finally {
        btnResolver.disabled = false;
        btnResolver.innerText = "Resolver Problema";
    }
});