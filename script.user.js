// ==UserScript==
// @name         Discord Simple Translate
// @namespace    http://tampermonkey.net/
// @version      2.7
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

    // Função para traduzir o texto usando a API do Google Translate
    function translateText(text, callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`,
            onload: function(response) {
                try {
                    const result = JSON.parse(response.responseText);
                    if (result && result[0]) {
                        // Juntar todas as partes da tradução (em caso de múltiplas linhas)
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

                // Cria o emoji de tradução (Bandeira do Brasil)
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

                // CSS para ajustar o tamanho da imagem diretamente
                emoji.style.width = '24px';
                emoji.style.height = '24px';

                translateEmoji.appendChild(emoji);

                // CSS para ajuste do emoji e a quebra de linha
                translateEmoji.style.display = 'block'; // Faz com que o emoji ocupe toda a linha
                translateEmoji.style.marginTop = '10px'; // Espaço entre o texto e o emoji
                translateEmoji.style.cursor = 'pointer'; // Adiciona o cursor de pointer no emoji
                translateEmoji.style.clear = 'both'; // Garante que o emoji vai para a próxima linha

                // Adiciona o evento de clique para o emoji de tradução
                translateEmoji.addEventListener('click', () => {
                    translateText(message.textContent, translatedText => {
                        // Cria um elemento para mostrar a tradução
                        const translationNode = document.createElement('div');
                        translationNode.style.fontSize = 'smaller';
                        translationNode.style.color = '#888';
                        translationNode.classList.add('translated-text');
                        translationNode.textContent = `${translatedText}`;

                        // Adiciona a tradução abaixo da mensagem original
                        if (!message.querySelector('.translated-text')) {
                            message.appendChild(translationNode);
                        }
                    });
                });

                // Adiciona o emoji abaixo da mensagem original
                message.appendChild(translateEmoji);
            }
        });
    }

    // Função para observar o container de mensagens para adicionar o emoji em novas mensagens
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

    // Inicializa o observador
    observeMessages();

    // Intervalo adicional para verificar mensagens periodicamente
    setInterval(addTranslateEmoji, 2000);
})();
