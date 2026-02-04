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

/**
 * Guarda la clave con una marca de tiempo de expiración.
 */
function guardarApiKey(key) {
    const ahora = new Date();
    const item = {
        value: key,
        expiry: ahora.getTime() + (7 * 24 * 60 * 60 * 1000) // Calcula 7 días en ms
    };
    localStorage.setItem('ludopatas_key_secure', JSON.stringify(item));
}

/**
 * Recupera la clave y verifica si ha caducado.
 */
function obtenerApiKey() {
    const itemStr = localStorage.getItem('ludopatas_key_secure');
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    const ahora = new Date();

    // Si el tiempo actual superó la expiración, borra y retorna null
    if (ahora.getTime() > item.expiry) {
        localStorage.removeItem('ludopatas_key_secure');
        return null;
    }
    return item.value;
}

// --- NAVEGACIÓN ENTRE PANTALLAS ---

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
        location.reload(); // Vuelve a la pantalla principal
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

// --- LÓGICA PRINCIPAL DE RESOLUCIÓN ---

btnResolver.addEventListener('click', async () => {
    const API_KEY = obtenerApiKey();
    if (!API_KEY) {
        alert("⚠️ No hay una API Key activa o ha caducado. Configúrala en el icono ⚙️.");
        return;
    }

    const promptText = document.getElementById('enunciado').value.trim();
    const file = document.getElementById('foto').files[0];

    if (!promptText && !file) return alert("Escribe un problema o sube una foto.");

    // Estado de carga
    btnResolver.disabled = true;
    btnResolver.innerText = "Consultando a la UMA...";
    resultBox.style.display = 'block';
    textoResultado.innerText = "Analizando el problema...";

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // CORRECCIÓN PARA ERROR 404: Forzamos el uso de la versión "v1"
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1" }
        );

        const instruction = "Eres un profesor de física experto. Resuelve paso a paso. Usa LaTeX para TODAS las fórmulas ($$ formula $$).";
        const parts = [instruction + "\n" + promptText];
        
        if (file) {
            parts.push(await fileToPart(file));
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        
        // Formatear respuesta con saltos de línea HTML
        textoResultado.innerHTML = response.text().replace(/\n/g, '<br>');
        
        // Renderizar ecuaciones matemáticas con MathJax
        if (window.MathJax) {
            MathJax.typeset();
        }

    } catch (e) {
        textoResultado.innerText = "Error: " + e.message;
    } finally {
        btnResolver.disabled = false;
        btnResolver.innerText = "Resolver Problema";
    }
});

// Vista previa de imagen seleccionada
document.getElementById('foto').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { 
            const p = document.getElementById('preview');
            p.src = e.target.result; 
            p.style.display = 'block'; 
        };
        reader.readAsDataURL(file);
    }
});