// background.js

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImage' && request.imageUrl) {
    // 현재 날짜와 시간 가져오기
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); // YY
    const month = String(now.getMonth() + 1).padStart(2, '0'); // MM
    const day = String(now.getDate()).padStart(2, '0'); // DD
    const hours = String(now.getHours()).padStart(2, '0'); // HH
    const minutes = String(now.getMinutes()).padStart(2, '0'); // MM
    const seconds = String(now.getSeconds()).padStart(2, '0'); // SS
    const milliseconds = String(now.getMilliseconds()).charAt(0); // M (첫 번째 숫자만 사용)

    // 파일 이름 포맷: YYMMDD_HHMMSSM_myimg.png
    const filename = `${year}${month}${day}_${hours}${minutes}${seconds}${milliseconds}_${request.promString}.png`;

    // 다운로드 옵션 설정
    const downloadOptions = {
      url: request.imageUrl,
      filename: filename,
      saveAs: false // 자동으로 다운로드 (사용자에게 저장 위치 묻지 않음)
    };

    // 다운로드 시도
    chrome.downloads.download(downloadOptions, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('이미지 다운로드 실패:', chrome.runtime.lastError);
      } else {
        console.log(`이미지 다운로드 성공! 다운로드 ID: ${downloadId}`);
      }
    });
  }
  else if (request.action === 'openExifPopup'){
    sendMessageToOpenExifPopup()
  }
  else if (request.action === 'generate' || request.action === 'getAllPrompt') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request, sendResponse);
      }
    });
  }
  else if (request.action === 'onClickedLoadpreset') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        lastTabWhenLoadpresetClicked = tabs[0].id
      }
      sendResponse()
    });
  }
  else if (request.action === 'insertPrompt') {
    if (lastTabWhenLoadpresetClicked){
      chrome.tabs.sendMessage(lastTabWhenLoadpresetClicked, request, sendResponse);
    }
  }

  return true
});


/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////            exif             ///////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////


// 확장 프로그램이 설치되거나 활성화될 때 context menu 등록
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "check-exif",
    title: "이미지 정보 확인(Ctrl+Shift+E)",
    contexts: ["image"], // 우클릭한 요소가 image일 경우만 노출
    documentUrlPatterns: ["https://novelai.net/image*"]
  }, () => {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "check-exif") {
        const imageUrl = info.srcUrl;
        await openExifPopup(imageUrl)
      }
    });
  });
});

async function openExifPopup(imageUrl) {
  const exifMeta = await extractPngMetadata(imageUrl);
  const exifStr = exifMeta['Comment']
  const exifData = JSON.parse(exifStr);

  await chrome.storage.local.set({ currentExifData: exifData });

  // // 팝업 오픈
  chrome.windows.create({
    url: "popup/exifpopup.html",
    type: "popup",
    width: 600,
    height: 800,
  });
}

function sendMessageToOpenExifPopup()
{
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length !== 0){
      const url = tabs[0].url;
      if (url && url.includes("novelai.net/image")) { 
        chrome.tabs.sendMessage(tabs[0].id, { action: "getImgsrcForExifopen" }, (response) => {
          if (response && response.src) {
            openExifPopup(response.src);
          }
        });
      }
    }
  });
}

async function extractPngMetadata(imageUrl) {
  try {
    // 이미지 데이터 가져오기
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const data = new DataView(arrayBuffer);

    // PNG 시그니처 확인
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 8; i++) {
      if (data.getUint8(i) !== pngSignature[i]) {
        throw new Error("Not a valid PNG file!");
      }
    }

    let offset = 8; // 시그니처 뒤에서 시작
    const metadata = {};

    // PNG chunks 읽기
    while (offset < data.byteLength) {
      const length = data.getUint32(offset); // Chunk 길이
      const type = String.fromCharCode(
        data.getUint8(offset + 4),
        data.getUint8(offset + 5),
        data.getUint8(offset + 6),
        data.getUint8(offset + 7)
      );

      if (type === "tEXt") {
        // tEXt 메타데이터 추출
        const textData = new Uint8Array(arrayBuffer, offset + 8, length);
        const text = new TextDecoder().decode(textData);
        const [key, value] = text.split("\u0000"); // Key-Value 쌍
        metadata[key] = value;
      }

      offset += 12 + length; // 다음 chunk로 이동 (length + type + CRC)
    }

    return metadata;
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "naitoolbar_openexif") {
    sendMessageToOpenExifPopup()
  }
});