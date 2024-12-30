/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////        text-swap        ///////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

const btnXPath = '//*[@id="__next"]/div[2]/div[4]/div[1]/div[5]/button';
const xPathMainprompt = '//*[@id="__next"]/div[2]/div[4]/div[1]/div[3]/div[2]/div/div[2]/textarea';
const imageXpath = '//*[@id="__next"]/div[2]/div[4]/div[2]/div[2]/div[2]/div/div/img';
const imageXpathWhenGenerating = '//*[@id="__next"]/div[2]/div[4]/div[2]/div[2]/div[3]/div/div/img';
const TIME_SWAPBACK_MS = 10

// XPath로 노드를 리턴하는 간단한 헬퍼 함수
function getNodeByXPath(xPath) {
  const result = document.evaluate(
    xPath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue;
}

function tryFindCharTextarea(n) {
    let textareaChar = getNodeByXPath(`//*[@id="__next"]/div[2]/div[4]/div[1]/div[3]/div[2]/div/div[4]/div[${n}]/div[3]/div[1]/textarea`);

    if (!textareaChar){
        textareaChar = getNodeByXPath(`//*[@id="__next"]/div[2]/div[4]/div[1]/div[3]/div[2]/div/div[6]/div[${n}]/div[3]/div[1]/textarea`)
    }

    return textareaChar
}

/**
 * applyTemplatedText 함수
 * @param {string} originalText - 원본 텍스트
 * @param {object} wildcardTable - 와일드카드 테이블
 * @param {boolean} willApplyWildcard - 와일드카드 적용 여부
 * @param {boolean} willApplyRandom - 랜덤 선택 적용 여부
 * @returns {string} 변경된 텍스트
 */
function applyTemplatedText(originalText, wildcardTable, willApplyWildcard, willApplyRandom) {
    let changedText = originalText;
    let continueLoop = true;

    // 와일드카드 대체 함수 (정규식 미사용)
    function replaceWildcards(text) {
        let result = "";
        let i = 0;

        while (i < text.length) {
            if (text[i] === "_" && text[i + 1] === "_") {
                let leftUnderbar = i;
                let rightUnderbar = text.indexOf("__", leftUnderbar + 2);
                if (rightUnderbar === -1) {
                    result += text.slice(i); // 더 이상 오른쪽 언더바가 없으면 남은 텍스트 추가
                    break;
                }
                let key = text.slice(leftUnderbar + 2, rightUnderbar);
                if (wildcardTable.hasOwnProperty(key)) {
                    const targetWildcardTable = wildcardTable[key].split("\n")
                    if (targetWildcardTable.length !== 0){
                        result += targetWildcardTable[Math.floor(Math.random() * targetWildcardTable.length)].trim();
                    }
                    else{
                        result += `__${key}__`; // 키가 없으면 원본 유지
                    }
                } else {
                    result += `__${key}__`; // 키가 없으면 원본 유지
                }
                i = rightUnderbar + 2; // 오른쪽 언더바 뒤로 이동
            } else {
                result += text[i];
                i++;
            }
        }

        return result;
    }

    // 랜덤 선택 대체 함수 (정규식 미사용)
    function replaceRandom(text) {
        let result = text;

        while (result.includes("<<")) {
            let start = result.lastIndexOf("<<"); // 가장 오른쪽 "<<"를 찾음
            let end = result.indexOf(">>", start); // 해당 "<<"의 끝 ">>"를 찾음
            if (end === -1) break; // ">>"가 없으면 루프 종료

            let content = result.slice(start + 2, end); // 꺽쇠 안의 내용 추출
            let options = content.split("|"); // 옵션으로 분리
            let randomOption = options[Math.floor(Math.random() * options.length)]; // 랜덤 선택

            // 선택된 옵션으로 치환
            result = result.slice(0, start) + randomOption + result.slice(end + 2);
        }

        return result;
    }

    while (continueLoop) {
        continueLoop = false;
        let newText = changedText;

        if (willApplyWildcard) {
            const replacedText = replaceWildcards(newText);
            if (replacedText !== newText) {
                newText = replacedText;
                continueLoop = true;
            }
        }

        if (willApplyRandom) {
            const replacedText = replaceRandom(newText);
            if (replacedText !== newText) {
                newText = replacedText;
                continueLoop = true;
            }
        }

        changedText = newText;
    }

    return changedText;
}

function getFromStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, resolve);
    });
}

//MAIN FUNCTION
function swapText(){
    return new Promise(async (resolve) => {
        const targetTextareaArr = []

        // 스토리지에서 설정값 가져오기
        const { wildcardTable = {}, willApplyWildcard = false, willApplyRandom = false } = await getFromStorage(['wildcardTable', 'willApplyWildcard', 'willApplyRandom']);

        // 둘 다 false면 대체하지 않음
        if (!willApplyWildcard && !willApplyRandom) {
            resolve(targetTextareaArr);
            return;
        }

        // 메인 프롬프트 바꾸기
        const textareaMainprom = getNodeByXPath(xPathMainprompt);
        if (textareaMainprom) {
            targetTextareaArr.push([textareaMainprom, textareaMainprom.value])
        }

        // v4의 경우 캐릭터별 텍스트 체크해서 바꾸기
        if (document.documentElement.innerHTML.includes("NAI Diffusion V4")) {
            let n = 3; 
            while (true) {
                const textareaChar = tryFindCharTextarea(n)
                if (textareaChar) {
                    targetTextareaArr.push([textareaChar, textareaChar.value])
                    n++;
                }
                else{
                    break;
                }
                if (n > 500){
                    console.warn("n이 너무 커서 루프를 종료합니다.");
                    break;
                }
            }
        }

        for (const textareaInfo of targetTextareaArr) {
            const textarea = textareaInfo[0]
            const originalValue = textareaInfo[1]

            // 새 값으로 변경
            const newValue = applyTemplatedText(originalValue, wildcardTable, willApplyWildcard, willApplyRandom);
            textarea.value = newValue;
            // React 등으로 인해 state 갱신 유도를 위해 input 이벤트도 날려줌
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        resolve(targetTextareaArr)
        return;
    });
}

function restoreText(targetTextareaArr) {
    setTimeout(() => {
        for (const textareaInfo of targetTextareaArr) {
            const textarea = textareaInfo[0]
            const originalValue = textareaInfo[1]
            
            textarea.value = originalValue;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, TIME_SWAPBACK_MS);
}

/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////           preset            ///////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////


function getAllPrompt()
{
    let mainPromptStr = ""
    let charPromptStrList = []
    const textareaMainprom = getNodeByXPath(xPathMainprompt);
    if (textareaMainprom) {
        mainPromptStr = textareaMainprom.value
    }

    // v4의 경우 캐릭터별 텍스트 체크해서 바꾸기
    if (document.documentElement.innerHTML.includes("NAI Diffusion V4")) {
        let n = 3; 
        while (true) {
            const textareaChar = tryFindCharTextarea(n)
            if (textareaChar) {
                charPromptStrList.push(textareaChar.value)
                n++;
            }
            else{
                break;
            }
            if (n > 500){
                console.warn("n이 너무 커서 루프를 종료합니다.");
                break;
            }
        }
    }

    return [mainPromptStr, charPromptStrList]
}

function insertPrompt(mainPromptStr, charPromptStrList)
{
    // 메인 프롬프트 바꾸기
    const textareaMainprom = getNodeByXPath(xPathMainprompt);
    if (textareaMainprom) {
        textareaMainprom.value = mainPromptStr;
        textareaMainprom.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // v4의 경우 캐릭터별 텍스트 체크해서 바꾸기
    if (document.documentElement.innerHTML.includes("NAI Diffusion V4")) {
        let n = 3; 
        while (true) {
            const textareaChar = tryFindCharTextarea(n)
            if (textareaChar) {
                textareaChar.value = charPromptStrList[n-3];
                textareaChar.dispatchEvent(new Event('input', { bubbles: true }));
                n++;
                if (charPromptStrList.length < n-2)
                {
                    break;
                }
            }
            else{
                break;
            }
            if (n > 500){
                console.warn("n이 너무 커서 루프를 종료합니다.");
                break;
            }
        }
    }
}



/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////        auto-generate        ///////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

let naiGenerateButton = null

/*******************************************************
 * 2) 핵심 행동 함수
 *******************************************************/

async function generate() {
    const targetTextareaArr = await swapText()

    naiGenerateButton.click();

    if (targetTextareaArr.length !== 0){
        restoreText(targetTextareaArr)
    }
}

// 1회 생성 로직
function tryOneClickGenerate() {
    //try라서 여러번 연타 될 수 있음.
    if (!naiGenerateButton.disabled) {
        generate()

        // 다운로드 로직
        downloadIntervalId = setInterval(() => {
            if (!naiGenerateButton.disabled) {
                clearInterval(downloadIntervalId);
                downloadIntervalId = null;

                // 다운로드
                chrome.storage.sync.get(['autoSaveEnabled'], (latest) => {
                    const stillAutoSaveEnabled = latest.autoSaveEnabled || false;
                    if (stillAutoSaveEnabled) {
                      downloadImage();
                    }
                });
            }
        }, 250); // 0.25초마다 체크
    }
}

// 자동 생성 로직
function startAutoClick() {
    if (!naiGenerateButton.disabled) {
        generate()
    }

    // 자동 생성은 맨처음 클릭 이후에도 계속 생성해줌    
    let lastDisabled = naiGenerateButton.disabled;
    chrome.storage.sync.get(['intervalTime', 'gcount'], (latest) => {
        const intervalTime = latest.intervalTime || 3;
        const gcount = latest.gcount || "";

        let nowCount = 1;
        autoClickIntervalId = setInterval(() => {
            const currentDisabled = naiGenerateButton.disabled;

            // 이전 상태는 disabled=true였고, 현재는 false로 변경되었을 때
            if (lastDisabled === true && currentDisabled === false) {
                // 다운로드
                chrome.storage.sync.get(['autoSaveEnabled'], (latest) => {
                    const stillAutoSaveEnabled = latest.autoSaveEnabled || false;
                    if (stillAutoSaveEnabled) {
                      downloadImage();
                    }
                });

                if (gcount && gcount > 0)
                {
                    if (gcount <= nowCount){
                        stopAutoClick()
                        chrome.runtime.sendMessage({ action: "onGcountEnd"});
                                
                        return;
                    }
                    else{
                        nowCount++
                    }
                }

                // 시간 초 기다려서 재시작
                autoClickTimeoutId = setTimeout(() => {
                    // 그 사이에 버튼이 또 비활성화 되었는지, 설정이 변경되지 않았는지 확인
                    chrome.storage.sync.get(['autoClickEnabled'], (latest) => {
                        const stillAutoClickEnabled = latest.autoClickEnabled || false;
                        if (stillAutoClickEnabled && !naiGenerateButton.disabled) {
                          generate();
                        }
                    });
                }, intervalTime * 1000);
            }

            lastDisabled = currentDisabled;
        }, 250); // 0.25초마다 체크}
    });
}

// 자동 생성 취소
function stopAutoClick() {
    if (autoClickIntervalId) {
      clearInterval(autoClickIntervalId);
      autoClickIntervalId = null;
    }
    if (autoClickTimeoutId) {
      clearTimeout(autoClickTimeoutId);
      autoClickTimeoutId = null;
    }
}

// 이미지 다운로드 함수
function downloadImage() {
  const imageElement = getNodeByXPath(imageXpath);
  if (imageElement && imageElement.src) {
    // 백그라운드로 이미지 다운로드 요청
    chrome.runtime.sendMessage({
      action: 'downloadImage',
      imageUrl: imageElement.src,
      promString : getNodeByXPath(xPathMainprompt).value.slice(0, 20)
    });
  }
}


/*******************************************************
 * 3) 메시지 리스너 세팅
 *******************************************************/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generate') {
        if (request.type === 'tryOneClick') {
            tryOneClickGenerate();
        } else if (request.type === 'autoClick') {
            startAutoClick();
        }
        sendResponse();
    } else if (request.action === 'cancelAutoClick') {
        stopAutoClick();
        sendResponse();
    } else if (request.action === 'getImgsrcForExifopen') {
        let imageElement = getNodeByXPath(imageXpath);
        if (!imageElement){
            imageElement = getNodeByXPath(imageXpathWhenGenerating);
        }
        if (imageElement){
            sendResponse({ src: imageElement.src });
        }
        else {
            sendResponse({ src: null });
        }
    } else if (request.action === 'getAllPrompt') {
        const prompts = getAllPrompt();
        sendResponse(prompts);
    } else if (request.action === 'insertPrompt') {
        const { mainPrompt, charPrompts } = request.data;
        insertPrompt(mainPrompt, charPrompts);
        sendResponse();
    }

    return true
});

/*******************************************************
 * 4) 버튼 찾기
 *******************************************************/

function waitForButton(targetXpath, onFound) {
  const pollInterval = 100; // 0.1초
  const pollId = setInterval(() => {
    const button = getNodeByXPath(targetXpath);
    if (button) {
      clearInterval(pollId);
      onFound(button);
    }
  }, pollInterval);
}

waitForButton(btnXPath, (button) => {
  naiGenerateButton = button
});
