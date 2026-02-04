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
        alert("⚠️ No hay una API Key activa o ha caducado. Configúrala en el icono ⚙️.");
        return;
    }

    const promptText = document.getElementById('enunciado').value.trim();
    const file = document.getElementById('foto').files[0];

    if (!promptText && !file) return alert("Escribe un problema o sube una foto.");

    btnResolver.disabled = true;
    btnResolver.innerText = "Consultando a la UMA...";
    resultBox.style.display = 'block';
    textoResultado.innerText = "Analizando el problema...";

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // CAMBIO CLAVE: Usamos v1beta para asegurar compatibilidad con gemini-1.5-flash
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1beta" } 
        );

        const instruction = "Eres un profesor de física experto. Resuelve paso a paso. Usa LaTeX para TODAS las fórmulas ($$ formula $$).";
        const parts = [];
        
        // Si hay imagen, la añadimos primero para que la IA la vea antes del texto
        if (file) {
            parts.push(await fileToPart(file));
        }
        parts.push(instruction + "\nEnunciado: " + promptText);

        const result = await model.