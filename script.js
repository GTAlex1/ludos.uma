// --- SELECTORES ---
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
    const item = {
        value: key,
        expiry: new Date().getTime() + (7 * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem('ludopatas_key_secure', JSON.stringify(item));
}

function obtenerApiKey() {
    const itemStr = localStorage.getItem('ludopatas_key_secure');
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    if (new Date().getTime() > item.expiry) {
        localStorage.removeItem('ludopatas_key_secure');
        return null;
    }
    return item.value;
}

// --- NAVEGACIÓN ---
btnConfig.addEventListener('click', () => {
    mainView.style.display = 'none';
    configMode.style.display = 'block';
});

btnGuardarConfig.addEventListener('click', () => {
    const key = apiInput.value.trim();
    if (key) {
        guardarApiKey(key);
        alert("Clave configurada con éxito.");
        location.reload(); 
    }
});

// --- RESOLUCIÓN DEL PROBLEMA (MÉTODO FETCH DIRECTO) ---
btnResolver.addEventListener('click', async () => {
    const API_KEY = obtenerApiKey();
    if (!API_KEY) {
        alert("⚠️ Por favor, configura tu API Key primero en el icono de engranaje.");
        return;
    }

    const promptText = document.getElementById('enunciado').value.trim();
    const file = document.getElementById('foto').files[0];

    if (!promptText && !file) return alert("Escribe un problema o sube una imagen.");

    btnResolver.disabled = true;
    btnResolver.innerText = "Consultando a Gemini 2.0...";
    resultBox.style.display = 'block';
    textoResultado.innerText = "Analizando el problema...";

    try {
        // Preparamos los "parts" para el JSON
        let parts = [{ 
            text: "Actúa como profesor de física experto. Resuelve paso a paso. Usa LaTeX con el delimitador $$ para TODAS las fórmulas.\n\nProblema: " + promptText 
        }];

        // Añadir imagen si existe
        if (file) {
            const base64 = await new Promise(r => {
                const reader = new FileReader();
                reader.onload = () => r(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });
            parts.push({
                inline_data: { 
                    mime_type: file.type, 
                    data: base64 
                }
            });
        }

        // Usamos el modelo 2.5 que tienes ilimitado
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: parts }] 
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        // Extraer texto de la respuesta
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Renderizar saltos de línea y fórmulas
        textoResultado.innerHTML = aiResponse.replace(/\n/g, '<br>');
        
        if (window.MathJax) {
            MathJax.typesetPromise().catch(err => console.error("Error MathJax:", err));
        }

    } catch (e) {
        textoResultado.innerText = "Error crítico: " + e.message;
        console.error("Detalle del error:", e);
    } finally {
        btnResolver.disabled = false;
        btnResolver.innerText = "Resolver Problema";
    }
});

// Vista previa de imagen
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