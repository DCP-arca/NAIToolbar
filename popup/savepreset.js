// popup/savepreset.js

document.addEventListener('DOMContentLoaded', () => {
    const presetNameInput = document.getElementById('presetName');
    const mainPromptTextarea = document.getElementById('mainPrompt');
    const charPromptsContainer = document.getElementById('charPromptsContainer');
    const saveBtn = document.getElementById('saveBtn');

    // tempPreset에 저장된 데이터를 로드
    chrome.storage.local.get('tempPreset', (data) => {
        if (data.tempPreset) {
            const [mainPrompt, charPrompts] = data.tempPreset;

            // 메인 프롬프트 표시
            mainPromptTextarea.value = mainPrompt;

            // 캐릭터 프롬프트 표시
            if (charPrompts && charPrompts.length > 0) {
                charPrompts.forEach((prompt, index) => {
                    const label = document.createElement('label');
                    label.innerHTML = `<span class="informtext">캐릭터 프롬프트 ${index + 1}:</span>`;
                    
                    const textarea = document.createElement('textarea');
                    textarea.value = prompt;
                    textarea.rows = 3;
                    textarea.readOnly = true;
                    
                    label.appendChild(textarea);
                    charPromptsContainer.appendChild(label);
                });
            } else {
                charPromptsContainer.style.display = 'none'; // 프롬프트가 없으면 숨기기
            }
        } else {
            alert("저장할 프롬프트 데이터가 없습니다.");
            window.close();
        }
    });

    saveBtn.addEventListener('click', () => {
        const presetName = presetNameInput.value.trim();
        const mainPrompt = mainPromptTextarea.value;

        if (!presetName) {
            alert('프리셋 이름을 입력해주세요.');
            return;
        }

        // 캐릭터 프롬프트 가져오기
        const charPrompts = Array.from(
            charPromptsContainer.querySelectorAll('textarea')
        ).map((textarea) => textarea.value);

        // 기존 프리셋 가져오기
        chrome.storage.local.get('presets', (data) => {
            const presets = data.presets || {};

            if (presets[presetName]) {
                if (!confirm('이미 존재하는 프리셋 이름입니다. 덮어쓰시겠습니까?')) {
                    return;
                }
            }

            presets[presetName] = {
                mainPrompt: mainPrompt,
                charPrompts: charPrompts
            };

            chrome.storage.local.set({ presets }, () => {
                alert('프리셋이 저장되었습니다.');
                window.close();
            });
        });
    });
});
