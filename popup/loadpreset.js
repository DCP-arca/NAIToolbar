// popup/loadpreset.js

document.addEventListener('DOMContentLoaded', () => {
    const presetDropdown = document.getElementById('presetDropdown');
    const mainPromptTextarea = document.getElementById('mainPrompt');
    const charPromptsContainer = document.getElementById('charPromptsContainer');
    const loadBtn = document.getElementById('loadBtn');

    // 프리셋 목록 로드
    chrome.storage.local.get('presets', (data) => {
        const presets = data.presets || {};
        for (const presetName in presets) {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName;
            presetDropdown.appendChild(option);
        }
    });

    presetDropdown.addEventListener('change', () => {
        const selectedPreset = presetDropdown.value;
        charPromptsContainer.innerHTML = ''; // 기존 내용 초기화

        if (selectedPreset) {
            chrome.storage.local.get('presets', (data) => {
                const presets = data.presets || {};
                const preset = presets[selectedPreset];

                if (preset) {
                    mainPromptTextarea.value = preset.mainPrompt;

                    if (preset.charPrompts && preset.charPrompts.length > 0) {
                        preset.charPrompts.forEach((prompt, index) => {
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
                        charPromptsContainer.style.display = 'none';
                    }
                    loadBtn.disabled = false;
                }
            });
        } else {
            mainPromptTextarea.value = '';
            charPromptsContainer.style.display = 'none';
            loadBtn.disabled = true;
        }
    });

    loadBtn.addEventListener('click', () => {
        const selectedPreset = presetDropdown.value;
        if (!selectedPreset) {
            alert('불러올 프리셋을 선택해주세요.');
            return;
        }

        chrome.storage.local.get('presets', (data) => {
            const presets = data.presets || {};
            const preset = presets[selectedPreset];

            if (preset) {
                chrome.runtime.sendMessage({
                    action: 'insertPrompt', 
                    data: {mainPrompt: preset.mainPrompt, charPrompts: preset.charPrompts}
                });
                alert('프리셋을 불러왔습니다.');
                window.close();
            };
        });
    });
});
