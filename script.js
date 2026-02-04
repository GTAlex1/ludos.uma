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
    if (!API_KEY) {
        alert("⚠️ Configura la API Key en el icono ⚙️.");
        return;
    }

    const promptText = document.getElementById('enunciado').value.trim();
    const file = document.getElementById('foto').files[0];

    if (!promptText && !file) return alert("Escribe algo o sube una foto.");

    btnResolver.disabled = true;
    btnResolver.innerText = "Consultando...";
    resultBox.style.display = 'block';
    textoResultado.innerText = "Pensando...";

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Usamos v1beta y el nombre del modelo con -latest para máxima compatibilidad
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash-latest" },
            { apiVersion: "v1beta" }
        );

        // Preparamos los "parts" como objetos de texto/imagen
        const instruction = "Actúa como profesor de física. Resuelve paso a paso. Usa LaTeX con $$ para fórmulas.";
        let parts = [
            { text: instruction + "\n\nEnunciado: " + promptText }
        ];
        
        if (file) {
            const imageData = await fileToPart(file);
            // El imageData ya devuelve el objeto { inlineData: {...} }
            parts.push(imageData);
        }

        // Llamada a la IA
        const result = await model.generateContent({ contents: [{ role: "user", parts: parts }] });
        const response = await result.response;
        
        textoResultado.innerHTML = response.text().replace(/\n/g, '<br>');
        
        if (window.MathJax) {
            MathJax.typesetPromise();
        }

    } catch (e) {
        console.error(e);
        textoResultado.innerText = "Error crítico: " + e.message;
    } finally {
        btnResolver.disabled = false;
        btnResolver.innerText = "Resolver Problema";
    }
});