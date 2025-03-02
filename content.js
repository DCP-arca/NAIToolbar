const TIME_SWAPBACK_MS = 20
const TIME_FINDING_NODE_MS = 500
const TIME_COMMON_WORK_MS = 100
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////        find-node        ///////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
// 엘리먼트의 full XPath를 구하는 헬퍼 함수
function getElementXPath(element) {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = element.previousSibling;
        while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                index++;
            }
            sibling = sibling.previousSibling;
        }
        path.unshift(`${element.tagName.toLowerCase()}[${index}]`);
        element = element.parentNode;
    }
    return '/' + path.join('/');
}

// HTML 텍스트에서, 인자로 들어온 정규표현식과 매칭되는 텍스트 노드를 가진 엘리먼트의 XPath를 찾는 함수
function findElementXPathByRegex(regexStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(document.documentElement.outerHTML, "text/html");
    const regex = new RegExp(regexStr);

    // 문서의 body 안에서 텍스트 노드를 순회한다
    const treeWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
        if (regex.test(currentNode.nodeValue)) {
            // 텍스트 노드의 부모 엘리먼트의 XPath를 반환한다
            return getElementXPath(currentNode.parentElement);
        }
        currentNode = treeWalker.nextNode();
    }
    // 매칭되는 텍스트가 없으면 null을 반환한다
    return null;
}

function findAllElementXpathByQuery(query) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(document.documentElement.outerHTML, "text/html");
    const editableDivs = doc.querySelectorAll(query);
    const xpaths = [];
    editableDivs.forEach(div => {
        xpaths.push(getElementXPath(div));
    });
    return xpaths;
}

function findAllDivXPathsByStyle(style) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(document.documentElement.outerHTML, "text/html");
    // style 속성에 targetStyle을 포함하는 div 요소들을 찾는다
    const targetDivs = doc.querySelectorAll(`div[style*="${style}"]`);
    const xpaths = [];
    targetDivs.forEach(div => {
        xpaths.push(getElementXPath(div));
    });
    return xpaths;
}

function checkLastTag(xpath) {
    const lastTagMatch = xpath.match(/\/([a-zA-Z0-9]+)\[?\d*\]?$/);
    if (!lastTagMatch) return "";

    const lastTag = lastTagMatch[1].toLowerCase();

    return lastTag
}
function countParentChildElements(xpath) {
    // XPath를 통해 해당 엘리먼트를 찾는다
    const element = document.evaluate(
        xpath, 
        document, 
        null, 
        XPathResult.FIRST_ORDERED_NODE_TYPE, 
        null
    ).singleNodeValue;
    
    // 만약 요소를 찾지 못하면 null을 반환한다
    if (!element) {
        return null;
    }
    
    // 부모 엘리먼트를 찾는다
    const parent = element.parentElement;
    if (!parent) {
        return null;
    }
    
    // 부모 엘리먼트의 자식 요소의 수를 반환한다
    return parent.children.length;
}

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

function checkUndesireContent() {
    const targetXPath = findElementXPathByRegex("Undesired Content");
    if (!targetXPath){
        return "화면 로딩을 기다리고 있습니다."
    }
    const targetType = checkLastTag(targetXPath);
    if (targetType == "div"){
        return "경고! Undesired Content를 접어주세요. 잘못된 동작이 발생합니다."
    }
    else if (targetType == "button" && countParentChildElements(targetXPath) != 1)
    {
        return "경고! Undesired Content가 눌려있습니다. 잘못된 동작이 발생합니다."
    }
    else
    {
        return ""
    }
}

function findGenerateButton(){
    try{
        return getNodeByXPath(findElementXPathByRegex("Generate . Image"));
    }catch (error) {
        return null
    }
}

function findPromptArea()
{
    try{
        const xpaths = findAllElementXpathByQuery("div[contenteditable]").map(item => getNodeByXPath(item + "/p"))

        if (xpaths.length < 2)
            return ["CantFindPromptArea", null, null]

        const firstHalf = xpaths.slice(0, Math.floor(xpaths.length / 2));

        return ["Okay", xpaths[0], xpaths.length < 4 ? null : firstHalf.slice(1)]
    }catch (error) {
        return ["Error", null, null]
    }
}

function findImageArea()
{
    try{
        return getNodeByXPath(findAllDivXPathsByStyle("width: 100%; display: flex; justify-content: center; align-items: center;")).querySelector('img')
    }catch (error) {
        return null
    }
}

let generateButton = null
function getNode(nodeName)
{
    chrome.storage.local.set({ undesireContentState: checkUndesireContent() });

    if (nodeName == "promt_main" || nodeName == "promt_char"){
        const promtAreaArr = findPromptArea();
        if (nodeName == "promt_main" && promtAreaArr[1]){
            return promtAreaArr[1]
        }
        if (nodeName == "promt_char" && promtAreaArr[2]){
            return promtAreaArr[2]
        }
    }
    if (nodeName == "button"){
        if (!generateButton){
            const button = findGenerateButton();
            if (button){
                generateButton = button
                return button
            }
        }
        else{
            return generateButton
        }
    }
    if (nodeName == "image"){
        const image = findImageArea();
        if (image){
            return image
        }
    }

    return null
}

/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////        text-swap        ///////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

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

function getFromStorageLocal(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}

function waitForNextFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

//MAIN FUNCTION
function swapText(){
    return new Promise(async (resolve) => {
        const targetTextareaArr = []

        // 스토리지에서 설정값 가져오기
        const { willApplyWildcard = false, willApplyRandom = false } = await getFromStorage(['willApplyWildcard', 'willApplyRandom']);
        const {wildcardTable = {}} = await getFromStorageLocal(['wildcardTable'])
        // 둘 다 false면 대체하지 않음
        if (!willApplyWildcard && !willApplyRandom) {
            resolve(targetTextareaArr);
            return;
        }

        // 메인 프롬프트 바꾸기
        const textareaMainprom = getNode("promt_main");
        if (textareaMainprom) {
            targetTextareaArr.push([textareaMainprom, textareaMainprom.textContent])
        }

        // v4의 경우 캐릭터별 텍스트 체크해서 바꾸기
        if (document.documentElement.innerHTML.includes("NAI Diffusion V4")) {
            let n = 0; 
            while (true) {
                const textareaCharArr = getNode("promt_char")
                if (!textareaCharArr) {break}

                const textareaChar = textareaCharArr[n];
                if (!textareaChar) {break}
                targetTextareaArr.push([textareaChar, textareaChar.textContent])
                n++;

                if (n > 50){
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
            textarea.textContent = newValue;
            // React 등으로 인해 state 갱신 유도를 위해 input 이벤트도 날려줌
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            await waitForNextFrame();
        }

        resolve(targetTextareaArr)
        return;
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function restoreText(targetTextareaArr) {
    await delay(TIME_SWAPBACK_MS);

    for (const textareaInfo of targetTextareaArr) {
        const textarea = textareaInfo[0];
        const originalValue = textareaInfo[1];

        textarea.textContent = originalValue;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await waitForNextFrame();
    }
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
    const textareaMainprom = getNode("promt_main");
    if (textareaMainprom) {
        mainPromptStr = textareaMainprom.textContent
    }

    // v4의 경우 캐릭터별 텍스트 체크해서 바꾸기
    if (document.documentElement.innerHTML.includes("NAI Diffusion V4")) {
        let n = 0; 
        while (true) {
            const textareaCharArr = getNode("promt_char")
            if (!textareaCharArr) {break}

            const textareaChar = textareaCharArr[n]
            if (!textareaChar) {break}
            charPromptStrList.push(textareaChar.textContent)
            n++;

            if (n > 50){
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
    const textareaMainprom = getNode("promt_main");
    if (textareaMainprom) {
        textareaMainprom.textContent = mainPromptStr;
        textareaMainprom.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // v4의 경우 캐릭터별 텍스트 체크해서 바꾸기
    if (document.documentElement.innerHTML.includes("NAI Diffusion V4")) {
        let n = 0; 
        while (true) {
            const textareaCharArr = getNode("promt_char")
            if (!textareaCharArr) { break }

            const textareaChar = textareaCharArr[n]
            if (!textareaChar) { break }

            textareaChar.textContent = charPromptStrList[n];
            textareaChar.dispatchEvent(new Event('input', { bubbles: true }));
            n++;
            if (charPromptStrList.length < n + 1)
            {
                break;
            }

            if (n > 50){
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

let autoClickIntervalId = null
let autoClickTimeoutId = null

/*******************************************************
 * 2) 핵심 행동 함수
 *******************************************************/

async function generate() {
    const targetTextareaArr = await swapText()

    await delay(TIME_SWAPBACK_MS)

    getNode("button").click();

    if (targetTextareaArr.length !== 0){
        await restoreText(targetTextareaArr)
    }
}

// 1회 생성 로직
function tryOneClickGenerate() {
    //try라서 여러번 연타 될 수 있음.
    if (!getNode("button").disabled) {
        generate()

        // 다운로드 로직
        downloadIntervalId = setInterval(() => {
            if (!getNode("button").disabled) {
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
        }, TIME_COMMON_WORK_MS); // 0.1초마다 체크
    }
}

// 자동 생성 로직
function startAutoClick() {
    if (!getNode("button").disabled) {
        generate()
    }

    // 자동 생성은 맨처음 클릭 이후에도 계속 생성해줌    
    let lastDisabled = getNode("button").disabled;
    chrome.storage.sync.get(['intervalTime', 'gcount'], (latest) => {
        const intervalTime = latest.intervalTime || 3;
        const gcount = latest.gcount || "";

        stopAutoClick()

        let nowCount = 1;
        autoClickIntervalId = setInterval(() => {
            const currentDisabled = getNode("button").disabled;

            // 이전 상태는 disabled=true였고, 현재는 false로 변경되었을 때
            if (lastDisabled === true && currentDisabled === false) {
                    try {
                    // 다운로드
                    chrome.storage.sync.get(['autoSaveEnabled'], (latest) => {
                        const stillAutoSaveEnabled = latest.autoSaveEnabled || false;
                        if (stillAutoSaveEnabled) {
                          downloadImage();
                        }
                    });
                    } catch (error) {
                    console.error('autoSaveEnabled get error:', error);
                    stopAutoClick();
                    return;
                }

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
                    try {
                        chrome.storage.sync.get(['autoClickEnabled'], (latest) => {
                            const stillAutoClickEnabled = latest.autoClickEnabled || false;
                            if (stillAutoClickEnabled && !getNode("button").disabled) {
                              generate();
                            }
                        });
                    } catch (error) {
                        console.error('autoSaveEnabled get error:', error);
                        stopAutoClick();
                        return;
                    }
                }, intervalTime * 1000);
            }

            lastDisabled = currentDisabled;
        }, TIME_COMMON_WORK_MS); // 0.1초마다 체크}
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
    const image = getNode("image")
    const prompt_main = getNode("promt_main");
    if (image && image.src && prompt_main) {
    // 백그라운드로 이미지 다운로드 요청
        chrome.runtime.sendMessage({
            action: 'downloadImage',
            imageUrl: image.src,
            promString : prompt_main.textContent.slice(0, 20)
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
        const imageElement = getNode("image");
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

let nodeRefreshIntervalId = setInterval(() => {
    chrome.storage.local.set({ undesireContentState: checkUndesireContent() });
}, TIME_FINDING_NODE_MS);

window.addEventListener('beforeunload', () => {
    stopAutoClick();

    if (autoClickIntervalId) {
        clearInterval(autoClickIntervalId);
        autoClickIntervalId = null;
    }
    if (nodeRefreshIntervalId){
        clearInterval(nodeRefreshIntervalId);
        nodeRefreshIntervalId = null;
    }
});