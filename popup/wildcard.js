document.addEventListener('DOMContentLoaded', () => {
    const wildcardTableBody = document.querySelector('#wildcardTable tbody');
    const addWildcardButton = document.getElementById('addWildcard');
    const importWildcardsButton = document.getElementById('importWildcards');
    const modal = document.getElementById('modal');
    const closeButton = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const wildcardKeyInput = document.getElementById('wildcardKey');
    const wildcardValueInput = document.getElementById('wildcardValue');
    const saveWildcardButton = document.getElementById('saveWildcard');

    let editingKey = null;

    // 와일드카드 목록 불러오기
    function loadWildcards() {
    chrome.storage.sync.get(['wildcardTable'], (data) => {
        const wildcardTable = data.wildcardTable || {};
        wildcardTableBody.innerHTML = ''; // 기존 내용 초기화

        for (const [key, value] of Object.entries(wildcardTable)) {
            const row = document.createElement('tr');

            const keyCell = document.createElement('td');
            keyCell.textContent = key;
            keyCell.classList.add("key");
            row.appendChild(keyCell);

            const valueCell = document.createElement('td');
            const dropdown = document.createElement('select');
            dropdown.classList.add("dropdown");

            // 값(value)을 \n로 구분하여 드롭다운 옵션 추가
            value.split('\n').forEach(optionValue => {
                const option = document.createElement('option');
                option.textContent = optionValue;
                option.value = optionValue;
                dropdown.appendChild(option);
            });

            valueCell.appendChild(dropdown);
            valueCell.classList.add("value");
            row.appendChild(valueCell);

            const actionsCell = document.createElement('td');
            actionsCell.classList.add("actions");

            const editButton = document.createElement('button');
            editButton.textContent = '수정';
            editButton.style.marginRight = '5px';
            editButton.addEventListener('click', () => {
                openModal('와일드 카드 수정', key, value);
            });
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '삭제';
            deleteButton.addEventListener('click', () => {
                deleteWildcard(key);
            });
            actionsCell.appendChild(deleteButton);

            row.appendChild(actionsCell);

            wildcardTableBody.appendChild(row);
        }
    });
}

    // 와일드카드 추가/수정 모달 열기
    function openModal(title, key = '', value = '') {
        modalTitle.textContent = title;
        wildcardKeyInput.value = key;
        wildcardValueInput.value = value;
        editingKey = key || null;
        modal.style.display = 'block';
    }

    // 모달 닫기
    function closeModal() {
        modal.style.display = 'none';
        wildcardKeyInput.value = '';
        wildcardValueInput.value = '';
        editingKey = null;
    }

    // 와일드카드 저장
    saveWildcardButton.addEventListener('click', () => {
        const key = wildcardKeyInput.value.trim();
        const value = wildcardValueInput.value;

        if (!key || !value) {
            alert('키와 값을 모두 입력해주세요.');
            return;
        }

        chrome.storage.sync.get(['wildcardTable'], (data) => {
            const wildcardTable = data.wildcardTable || {};

            // 이미 존재하는 키인지 확인
            if (editingKey === null && wildcardTable.hasOwnProperty(key)) {
                if (!confirm(`키값인 "${key}"가 이미 존재합니다. 덮어 쓰시겠습니까?`)) {
                    return; // 덮어쓰지 않으면 종료
                }
            }

            if (editingKey) {
                // 기존 키 삭제
                delete wildcardTable[editingKey];
            }

            // 새 키-값 추가
            wildcardTable[key] = value;

            chrome.storage.sync.set({ wildcardTable }, () => {
                loadWildcards();
                closeModal();
            });
        });
    });

    // 와일드카드 삭제
    function deleteWildcard(key) {
        if (confirm(`정말로 와일드카드 "${key}"(을)를 삭제하시겠습니까?`)) {
            chrome.storage.sync.get(['wildcardTable'], (data) => {
                const wildcardTable = data.wildcardTable || {};
                delete wildcardTable[key];
                chrome.storage.sync.set({ wildcardTable }, () => {
                    loadWildcards();
                });
            });
        }
    }

    // 와일드카드 가져오기 (파일 불러오기)
    importWildcardsButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.multiple = true;
        input.onchange = e => {
            const files = event.target.files;
            if (!files.length) return;

            const newWD = {}
            let processedFiles = 0;
            Array.from(files).forEach((file) => {
                const reader = new FileReader();

                reader.onload = function(event) {
                    const content = event.target.result;

                    key = file.name.replace(/\.[^/.]+$/, ''); //확장자 제거
                    value = content.replace("\r", "") //\r제거

                    newWD[key] = value

                    processedFiles++;
                    if (processedFiles === files.length) {
                        chrome.storage.sync.get(['wildcardTable'], (data) => {
                            const wildcardTable = data.wildcardTable || {};
                            Object.assign(wildcardTable, newWD);
                            chrome.storage.sync.set({ wildcardTable }, () => {
                                loadWildcards();
                            });
                        });
                    }
                };
                reader.readAsText(file);
            });
        };
        input.click();
    });

    // 모달 닫기 버튼
    closeButton.addEventListener('click', closeModal);

    // 모달 외부 클릭 시 닫기
    window.addEventListener('mousedown', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });

    // 와일드카드 추가 버튼 클릭 시 모달 열기
    addWildcardButton.addEventListener('click', () => {
        openModal('새 와일드 카드 작성');
    });

    // 초기 로드
    loadWildcards();
});
