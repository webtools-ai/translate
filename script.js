// 音声認識のセットアップ
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
let isRecording = false;
let currentSourceText = '';
let currentTargetText = '';

// DOM要素の取得
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const sourceText = document.getElementById('source-text');
const targetText = document.getElementById('target-text');
const statusMessage = document.getElementById('status');
const sourceLanguage = document.getElementById('sourceLanguage');
const targetLanguage = document.getElementById('targetLanguage');

// 利用可能な言語のリスト
const languages = {
    'ja-JP': '日本語',
    'en-US': '英語',
    'ko-KR': '韓国語',
    'zh-CN': '中国語（簡体字）',
    'zh-TW': '中国語（繁体字）',
    'es-ES': 'スペイン語',
    'fr-FR': 'フランス語',
    'de-DE': 'ドイツ語',
    'it-IT': 'イタリア語',
    'ru-RU': 'ロシア語'
};

// 翻訳API用の言語コード
const translateLanguages = {
    'ja': '日本語',
    'en': '英語',
    'ko': '韓国語',
    'zh-CN': '中国語（簡体字）',
    'zh-TW': '中国語（繁体字）',
    'es': 'スペイン語',
    'fr': 'フランス語',
    'de': 'ドイツ語',
    'it': 'イタリア語',
    'ru': 'ロシア語'
};

// 音声認識の初期設定
recognition.continuous = true;
recognition.interimResults = true;

// ステータスメッセージを表示する関数
function updateStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message' + (isError ? ' error' : '');
}

// テキストを表示する関数
function displayText(element, text, isInterim = false) {
    if (isInterim) {
        // 中間結果の場合、現在の暫定テキストを更新
        const interimElement = element.querySelector('.interim');
        if (interimElement) {
            interimElement.textContent = `${new Date().toLocaleTimeString()}: ${text}`;
        } else {
            const newInterim = document.createElement('p');
            newInterim.textContent = `${new Date().toLocaleTimeString()}: ${text}`;
            newInterim.classList.add('interim');
            element.insertBefore(newInterim, element.firstChild);
        }
    } else {
        // 最終結果の場合、新しいテキストを先頭に追加
        const newParagraph = document.createElement('p');
        newParagraph.textContent = `${new Date().toLocaleTimeString()}: ${text}`;
        
        // 中間結果を削除
        const interimElement = element.querySelector('.interim');
        if (interimElement) {
            interimElement.remove();
        }
        
        // 新しい確定テキストを先頭に追加
        element.insertBefore(newParagraph, element.firstChild);
    }
}

// 翻訳を実行する関数
async function translateText(text, sourceLang, targetLang) {
    try {
        const encodedText = encodeURIComponent(text);
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();
        
        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        } else {
            throw new Error('翻訳エラー: ' + data.responseStatus);
        }
    } catch (error) {
        console.error('翻訳エラー:', error);
        updateStatus('翻訳中にエラーが発生しました', true);
        return null;
    }
}

// セレクトボックスの選択肢を更新する関数
function updateLanguageOptions() {
    const sourceLang = sourceLanguage.value;
    const baseSourceLang = sourceLang.split('-')[0];

    // 翻訳後の言語の選択肢を更新
    targetLanguage.innerHTML = '';
    Object.entries(translateLanguages).forEach(([code, name]) => {
        if (code !== baseSourceLang) {
            const option = new Option(name, code);
            targetLanguage.add(option);
        }
    });
}

// 音声認識用の言語選択肢を生成
function initializeSourceLanguages() {
    sourceLanguage.innerHTML = '';
    Object.entries(languages).forEach(([code, name]) => {
        const option = new Option(name, code);
        sourceLanguage.add(option);
    });
}

// 音声認識の結果処理
recognition.onresult = async function(event) {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;

    if (!result.isFinal) {
        // 中間結果の表示と翻訳
        displayText(sourceText, transcript, true);
        
        const sourceLang = sourceLanguage.value.split('-')[0];
        const targetLang = targetLanguage.value;
        
        const translatedText = await translateText(transcript, sourceLang, targetLang);
        if (translatedText) {
            displayText(targetText, translatedText, true);
        }
    } else {
        // 最終結果の確定
        currentSourceText = transcript;
        displayText(sourceText, currentSourceText);
        
        const sourceLang = sourceLanguage.value.split('-')[0];
        const targetLang = targetLanguage.value;
        
        const translatedText = await translateText(currentSourceText, sourceLang, targetLang);
        if (translatedText) {
            currentTargetText = translatedText;
            displayText(targetText, currentTargetText);
            updateStatus('翻訳完了');
        }
    }
};

// エラーハンドリング
recognition.onerror = function(event) {
    console.error('音声認識エラー:', event.error);
    updateStatus(`音声認識エラー: ${event.error}`, true);
    stopRecording();
};

// 音声認識が終了した時の処理
recognition.onend = function() {
    if (isRecording) {
        recognition.start();
    }
};

// 録音開始処理
function startRecording() {
    try {
        recognition.start();
        isRecording = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        updateStatus('音声認識中...');
    } catch (error) {
        console.error('録音開始エラー:', error);
        updateStatus('録音の開始に失敗しました', true);
    }
}

// 録音停止処理
function stopRecording() {
    recognition.stop();
    isRecording = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    updateStatus('停止中');
}

// 言語選択の変更イベント
sourceLanguage.addEventListener('change', function(e) {
    recognition.lang = e.target.value;
    updateLanguageOptions();
    if (isRecording) {
        recognition.stop();
        recognition.start();
    }
});

// ボタンのイベントリスナー設定
startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // 言語選択の初期化
    initializeSourceLanguages();
    sourceLanguage.value = 'ja-JP';  // 話す言語を日本語に
    updateLanguageOptions();
    targetLanguage.value = 'en';     // 翻訳後の言語を英語に
    recognition.lang = sourceLanguage.value;
    
    stopButton.disabled = true;
    
    // ブラウザの音声認識対応チェック
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        updateStatus('お使いのブラウザは音声認識に対応していません', true);
        startButton.disabled = true;
    } else {
        updateStatus('話し始めるボタンを押して話してください');
    }
});
