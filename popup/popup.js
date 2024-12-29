document.addEventListener('DOMContentLoaded', () => {
  /////// 자동생성 옵션
  const toggleBtn = document.getElementById('toggleBtn');
  const oneClickGenerateBtn = document.getElementById('oneClickGenerateBtn');
  const intervalInput = document.getElementById('intervalInput');
  const gcountInput = document.getElementById('gcountInput')
  const openExifPopupButton = document.getElementById('openExifPopupButton');

  function updateButtonStates(isActive) {
      toggleBtn.textContent = isActive ? '자동 생성 취소' : '자동 생성 시작';
      toggleBtn.disabled = false;
      oneClickGenerateBtn.disabled = isActive;
      toggleBtn.classList.toggle('active', isActive);
      oneClickGenerateBtn.style.opacity = isActive ? '0.5' : '1';
      intervalInput.disabled = isActive
      gcountInput.disabled = isActive
  }
  
  // 1회 생성 버튼 동작
  oneClickGenerateBtn.addEventListener('click', () => {
      if (!oneClickGenerateBtn.disabled) {
        chrome.runtime.sendMessage(
          { action: 'generate', type: 'tryOneClick' }
        );
      }
  });

  // 자동 생성 버튼 동작
  toggleBtn.addEventListener('click', () => {
      const currentState = toggleBtn.classList.contains('active');
      const newState = !currentState;

      chrome.storage.sync.set({ autoClickEnabled: newState, }, () => {
          updateButtonStates(newState);
        }
      );

      // 버튼 상태 업데이트
      if (newState) {
          chrome.runtime.sendMessage(
              { action: 'generate', type: 'autoClick' }
          );
      } else {
          chrome.runtime.sendMessage({ action: 'cancelAutoClick' });
      }
  });
  intervalInput.addEventListener('change', () => {
      chrome.storage.sync.set({ intervalTime: intervalInput.value })
  });
  gcountInput.addEventListener('change', () => {
      chrome.storage.sync.set({ gcount: gcountInput.value })
  });

  /////// 프리셋
  const savePresetBtn = document.getElementById('savePresetBtn');
  const loadPresetBtn = document.getElementById('loadPresetBtn');
  const managePresetBtn = document.getElementById('managePresetBtn');

  savePresetBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'getAllPrompt' }, (response) => {
          if (response) {
              chrome.storage.local.set({ tempPreset: response }, () => {
                  window.open('savepreset.html', 'Save Preset', 'width=800,height=550');
              });
          }
      });
  });

  loadPresetBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'onClickedLoadpreset' }, () =>{
        window.open('loadpreset.html', 'Load Preset', 'width=800,height=550');
      })
  });

  managePresetBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/managepreset.html') });
  });

  /////// 와카/랜덤
  const applyWildcardCheckbox = document.getElementById('applyWildcard');
  const applyRandomCheckbox = document.getElementById('applyRandom');
  const manageWildcardsButton = document.getElementById('manageWildcards');

  // 체크박스 상태 변경 시 저장
  applyWildcardCheckbox.addEventListener('change', () => {
      chrome.storage.sync.set({ willApplyWildcard: applyWildcardCheckbox.checked });
  });

  applyRandomCheckbox.addEventListener('change', () => {
      chrome.storage.sync.set({ willApplyRandom: applyRandomCheckbox.checked });
  });

  // 와일드카드 관리 버튼 클릭 시 새 탭 열기
  manageWildcardsButton.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/wildcard.html') });
  });

  //////// 이미지 정보 확인
  openExifPopupButton.addEventListener('click', () => {
      if (!openExifPopupButton.disabled) {
        chrome.runtime.sendMessage(
          { action: 'openExifPopup'}
        );
      }
  });
  ///////////// 오토 세이브

  const autoSaveCheckbox = document.getElementById('autoSaveCheckbox');
  autoSaveCheckbox.addEventListener('change', () => {
      chrome.storage.sync.set({ autoSaveEnabled: autoSaveCheckbox.checked });
  });

  ///////////// 상태 업데이트
  function setMyButtonDisabled(isDisabled) {
    toggleBtn.disabled = isDisabled
    oneClickGenerateBtn.disabled = isDisabled
    openExifPopupButton.disabled = isDisabled
    savePresetBtn.disabled = isDisabled
    loadPresetBtn.disabled = isDisabled
  }

  setMyButtonDisabled(true)
  chrome.storage.sync.get(['autoClickEnabled', 'intervalTime', 'gcount', 'autoSaveEnabled'], (result) => {
    const isAutoClickEnabled = result.autoClickEnabled || false;
    const intervalTime = result.intervalTime || 3;
    const gcount = result.gcount || "";
    const isAutoSaveEnabled = result.autoSaveEnabled || false;

    //novel ai check
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let isNotNovelAI = true
      if (tabs && tabs.length !== 0){
        const url = tabs[0].url;
        if (url && url.includes("novelai.net/image")) {
          setMyButtonDisabled(false)
          updateButtonStates(isAutoClickEnabled)
        }
      }
    });

    // 입력 필드 및 체크박스 상태 업데이트
    intervalInput.value = intervalTime;
    gcountInput.value = gcount;
    autoSaveCheckbox.checked = isAutoSaveEnabled;
  });

  chrome.storage.sync.get(['willApplyWildcard', 'willApplyRandom'], (data) => {
      applyWildcardCheckbox.checked = data.willApplyWildcard || false;
      applyRandomCheckbox.checked = data.willApplyRandom || false;
  });
  
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "onGcountEnd") {
      updateButtonStates(false)
    }
  });
});
