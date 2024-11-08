// ==UserScript==
// @name         Discord Simple Translate
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Add a translate button with flag emoji below each Discord message to translate to the target language
// @downloadURL  https://raw.githubusercontent.com/drickferreira/discord_simple_translate/refs/heads/main/script.js
// @updateURL    https://raw.githubusercontent.com/drickferreira/discord_simple_translate/refs/heads/main/script.js
// @match        https://discord.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      translate.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Idiomas disponíveis com bandeiras
    const languages = {
        "en": { name: "English", emoji: '/assets/09598dcec149fda6bebb.svg' },
        "pt": { name: "Português", emoji: '/assets/90a19fa60554e54432a7.svg' },
        "ru": { name: "Русский", emoji: '/assets/1710858579c863d586e0.svg' },
        "es": { name: "Español", emoji: '/assets/a7fed947d1551fbdcec0.svg' },
        "fr": { name: "Français", emoji: '/assets/4e85af0a9a2865ee082e.svg' }
        // Adicione mais idiomas conforme necessário
    };

    // Obter idioma salvo ou usar padrão "pt"
    let targetLanguage = GM_getValue("targetLanguage", "pt");

    // Configuração de "Tamanho mínimo do texto"
    const defaultMinTextSize = 10;
    const minTextSize = GM_getValue("minTextSize", defaultMinTextSize);

    // Função para atualizar o idioma e a bandeira
    function updateLanguage(newLangCode) {
        if (languages[newLangCode]) {
            targetLanguage = newLangCode;
            GM_setValue("targetLanguage", newLangCode);
            alert(`Idioma de destino atualizado para: ${languages[newLangCode].name}`);
        }
    }

    // Registrar o menu para selecionar idiomas
    Object.keys(languages).forEach(langCode => {
        GM_registerMenuCommand(
            `${languages[langCode].name}`,
            () => updateLanguage(langCode)
        );
    });

    // Comando para definir o tamanho mínimo do texto
    GM_registerMenuCommand("Configurar Tamanho Mínimo do Texto", () => {
        const newSize = prompt("Defina o tamanho mínimo do texto:", minTextSize);
        if (newSize && !isNaN(newSize)) {
            GM_setValue("minTextSize", parseInt(newSize, 10));
            alert(`Tamanho mínimo do texto configurado para: ${newSize}`);
        }
    });

    // Função para traduzir o texto usando a API do Google Translate
    function translateText(text, callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`,
            onload: function(response) {
                try {
                    const result = JSON.parse(response.responseText);
                    if (result && result[0]) {
                        let translatedText = result[0].map(item => item[0]).join(' ');
                        callback(translatedText);
                    } else {
                        console.error("Erro ao processar a tradução: formato inesperado da resposta", result);
                    }
                } catch (e) {
                    console.error("Erro ao tentar parsear a resposta da tradução:", e);
                }
            },
            onerror: function(error) {
                console.error("Erro ao chamar a API de tradução:", error);
            }
        });
    }

    // Função para adicionar o emoji de tradução em cada mensagem
    function addTranslateEmoji() {
        const messages = document.querySelectorAll('[id^="chat-messages"] .messageContent_f9f2ca');

        messages.forEach(message => {
            // Verificando se o emoji já foi adicionado
            if (!message.querySelector('.translate-emoji')) {
                
                // Verifica o tamanho mínimo do texto (removendo caracteres não alfanuméricos)
                const textContent = message.textContent || "";
                const cleanedText = textContent.replace(/[^a-zA-Z0-9]/g, "");
                if (cleanedText.length < minTextSize) {
                    return; // Não cria o botão se o texto não atender ao tamanho mínimo
                }

                // Cria o emoji de tradução
                const translateEmoji = document.createElement('span');
                translateEmoji.classList.add('emojiContainer_bae8cb', 'emojiContainerClickable_bae8cb', 'emojiJumbo_bae8cb', 'translate-emoji');
                translateEmoji.setAttribute('aria-expanded', 'false');
                translateEmoji.setAttribute('role', 'button');
                translateEmoji.setAttribute('tabindex', '0');

                const emoji = document.createElement('img');
                emoji.setAttribute('aria-label', '🇧🇷');
                emoji.setAttribute('src', languages[targetLanguage].emoji);
                emoji.setAttribute('alt', '🇧🇷');
                emoji.setAttribute('draggable', 'false');

                emoji.style.width = '24px';
                emoji.style.height = '24px';

                translateEmoji.appendChild(emoji);

                translateEmoji.style.display = 'block'; 
                translateEmoji.style.marginTop = '10px'; 
                translateEmoji.style.cursor = 'pointer'; 
                translateEmoji.style.clear = 'both';

                translateEmoji.addEventListener('click', () => {
                    translateText(message.textContent, translatedText => {
                        const translationNode = document.createElement('div');
                        translationNode.style.fontSize = 'smaller';
                        translationNode.style.color = '#888';
                        translationNode.classList.add('translated-text');
                        translationNode.textContent = `${translatedText}`;

                        if (!message.querySelector('.translated-text')) {
                            message.appendChild(translationNode);
                        }
                    });
                });

                message.appendChild(translateEmoji);
            }
        });
    }

    function observeMessages() {
        const chatContainer = document.querySelector('[id^="chat-messages"]');
        if (chatContainer) {
            const observer = new MutationObserver(() => {
                addTranslateEmoji();
            });
            observer.observe(chatContainer, { childList: true, subtree: true });
        } else {
            setTimeout(observeMessages, 1000);
        }
    }

    observeMessages();
    setInterval(addTranslateEmoji, 2000);
})();
