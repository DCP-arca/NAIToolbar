// popup/managepreset.js

document.addEventListener('DOMContentLoaded', () => {
    const presetsTableBody = document.querySelector('#presetsTable tbody');
    const addPresetBtn = document.getElementById('addPresetBtn');
    const presetModal = document.getElementById('presetModal');
    const closeModalBtn = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const modalPresetName = document.getElementById('modalPresetName');
    const modalMainPrompt = document.getElementById('modalMainPrompt');
    const modalCharPromptsContainer = document.getElementById('modalCharPromptsContainer');
    const addCharPromptBtn = document.getElementById('addCharPromptBtn');
    const savePresetBtn = document.getElementById('savePresetBtn');

    let isEditing = false;
    let editingPresetName = '';

    // 프리셋 목록 로드
    function loadPresets() {
        presetsTableBody.innerHTML = '';
        chrome.storage.local.get('presets', (data) => {
            const presets = data.presets || {};
            for (const presetName in presets) {
                const preset = presets[presetName];
                const row = document.createElement('tr');

                const nameCell = document.createElement('td');
                nameCell.classList.add('key');
                nameCell.textContent = presetName;

                const mainPromptCell = document.createElement('td');
                mainPromptCell.classList.add('value');
                mainPromptCell.textContent = preset.mainPrompt;

                const charPromptsCell = document.createElement('td');
                charPromptsCell.classList.add('value');
                charPromptsCell.innerHTML = preset.charPrompts.map((prompt, index) => 
                    `<div>캐릭터 ${index + 1}: ${prompt}</div>`
                ).join('');

                const actionsCell = document.createElement('td');
                actionsCell.classList.add('actions');

                const editBtn = document.createElement('button');
                editBtn.textContent = '수정';
                editBtn.addEventListener('click', () => openEditModal(presetName, preset));

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '삭제';
                deleteBtn.style.backgroundColor = '#f44336';
                deleteBtn.style.marginLeft = '5px';
                deleteBtn.addEventListener('click', () => deletePreset(presetName));

                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);

                row.appendChild(nameCell);
                row.appendChild(mainPromptCell);
                row.appendChild(charPromptsCell);
                row.appendChild(actionsCell);

                presetsTableBody.appendChild(row);
            }
        });
    }

    // 프리셋 삭제
    function deletePreset(presetName) {
        if (confirm(`프리셋 "${presetName}"을(를) 삭제하시겠습니까?`)) {
            chrome.storage.local.get('presets', (data) => {
                const presets = data.presets || {};
                delete presets[presetName];
                chrome.storage.local.set({ presets }, () => {
                    loadPresets();
                });
            });
        }
    }

    // 모달 열기 (추가 또는 수정)
    function openModal() {
        presetModal.style.display = 'block';
    }

    function closeModal() {
        presetModal.style.display = 'none';
        isEditing = false;
        editingPresetName = '';
        modalTitle.textContent = '프리셋 추가';
        modalPresetName.value = '';
        modalPresetName.disabled = false;
        modalMainPrompt.value = '';
        modalCharPromptsContainer.innerHTML = ''; // 캐릭터 프롬프트 초기화
    }

    // 캐릭터 프롬프트 추가
    addCharPromptBtn.addEventListener('click', () => {
        const label = document.createElement('label');
        label.innerHTML = `<span class="informtext">캐릭터 프롬프트:</span>`;

        const textarea = document.createElement('textarea');
        textarea.rows = 3;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '삭제';
        removeBtn.style.backgroundColor = '#f44336';
        removeBtn.addEventListener('click', () => label.remove());

        label.appendChild(textarea);
        label.appendChild(removeBtn);
        modalCharPromptsContainer.appendChild(label);
    });

    // 프리셋 추가
    addPresetBtn.addEventListener('click', () => {
        isEditing = false;
        editingPresetName = '';
        modalTitle.textContent = '프리셋 추가';
        modalPresetName.value = '';
        modalPresetName.disabled = false;
        modalMainPrompt.value = '';
        modalCharPromptsContainer.innerHTML = ''; // 캐릭터 프롬프트 초기화
        openModal();
    });

    // 프리셋 수정
    function openEditModal(presetName, preset) {
        isEditing = true;
        editingPresetName = presetName;
        modalTitle.textContent = `프리셋 수정: ${presetName}`;
        modalPresetName.value = presetName;
        modalPresetName.disabled = true;
        modalMainPrompt.value = preset.mainPrompt;

        modalCharPromptsContainer.innerHTML = '';
        preset.charPrompts.forEach((prompt) => {
            const label = document.createElement('label');
            label.innerHTML = `<span class="informtext">캐릭터 프롬프트:</span>`;

            const textarea = document.createElement('textarea');
            textarea.value = prompt;
            textarea.rows = 3;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '삭제';
            removeBtn.style.backgroundColor = '#f44336';
            removeBtn.addEventListener('click', () => label.remove());

            label.appendChild(textarea);
            label.appendChild(removeBtn);
            modalCharPromptsContainer.appendChild(label);
        });
        openModal();
    }

    // 모달 저장 버튼
    savePresetBtn.addEventListener('click', () => {
        const presetName = modalPresetName.value.trim();
        const mainPrompt = modalMainPrompt.value.trim();
        const charPrompts = Array.from(
            modalCharPromptsContainer.querySelectorAll('textarea')
        ).map((textarea) => textarea.value.trim());

        if (!presetName) {
            alert('프리셋 이름을 입력해주세요.');
            return;
        }

        if (!mainPrompt) {
            alert('메인 프롬프트를 입력해주세요.');
            return;
        }

        chrome.storage.local.get('presets', (data) => {
            const presets = data.presets || {};

            if (!isEditing && presets[presetName]) {
                alert('이미 존재하는 프리셋 이름입니다.');
                return;
            }

            presets[presetName] = {
                mainPrompt: mainPrompt,
                charPrompts: charPrompts
            };

            chrome.storage.local.set({ presets }, () => {
                loadPresets();
                closeModal();
            });
        });
    });

    // 모달 닫기 버튼
    closeModalBtn.addEventListener('click', closeModal);

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target == presetModal) {
            closeModal();
        }
    });

    // 초기 프리셋 로드
    loadPresets();
});
