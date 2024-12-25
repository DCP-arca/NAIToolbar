// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  // background에서 저장해둔 EXIF JSON 가져오기
  const { currentExifData } = await chrome.storage.local.get("currentExifData");

  // prompt 가 없는 경우 UI 표시할 게 없으므로 종료
  if (!currentExifData || !currentExifData.prompt) {
    document.body.innerHTML = "<p>유효한 EXIF JSON (prompt) 정보가 없습니다.</p>";
    return;
  }

  // 1) prompt 섹션
  document.getElementById("promptValue").value = currentExifData.prompt ?? "";

  // 2) 기타 필드들
  document.getElementById("stepsValue").value =
    currentExifData.steps ?? "";
  document.getElementById("heightValue").value =
    currentExifData.height ?? "";
  document.getElementById("widthValue").value =
    currentExifData.width ?? "";
  document.getElementById("scaleValue").value =
    currentExifData.scale ?? "";
  document.getElementById("seedValue").value =
    currentExifData.seed ?? "";
  document.getElementById("noiseScheduleValue").value =
    currentExifData.noise_schedule ?? "";
  document.getElementById("samplerValue").value =
    currentExifData.sampler ?? "";
  document.getElementById("smValue").value =
    currentExifData.sm ?? "";
  document.getElementById("smDynValue").value =
    currentExifData.sm_dyn ?? "";
  document.getElementById("ucValue").value =
    currentExifData.uc ?? "";

  // 3) reference_information_extracted_multiple, reference_strength_multiple
  //    배열이므로 문자열화해서 보여주기 (혹은 UI를 다르게 구성해도 됨)
  document.getElementById("refInfoMultiple").value = JSON.stringify(
    currentExifData.reference_information_extracted_multiple ?? [],
    null,
    2
  );
  document.getElementById("refStrengthMultiple").value = JSON.stringify(
    currentExifData.reference_strength_multiple ?? [],
    null,
    2
  );

  // 4) v4_prompt
  if (currentExifData.v4_prompt) {
    const v4Section = document.getElementById("v4PromptSection");
    v4Section.style.display = "block";

    const v4Prompt = currentExifData.v4_prompt;
    const caption = v4Prompt.caption || {};
    document.getElementById("v4BaseCaption").value = caption.base_caption ?? "";
    document.getElementById("v4UseCoords").value = v4Prompt.use_coords ?? "";
    document.getElementById("v4UseOrder").value = v4Prompt.use_order ?? "";

    // char_captions 테이블
    const charCaptions = caption.char_captions || [];
    const tbody = document.getElementById("v4CharCaptionsTable").querySelector("tbody");
    tbody.innerHTML = "";
    charCaptions.forEach((item) => {
      const tr = document.createElement("tr");

      // char_caption
      const tdCaption = document.createElement("td");
      tdCaption.textContent = item.char_caption ?? "";

      // centers 배열 -> 문자열 변환
      const centersArray = item.centers || [];
      const centersStr = centersArray
        .map((c) => `(${c.x}, ${c.y})`)
        .join(", ");
      const tdCenters = document.createElement("td");
      tdCenters.textContent = centersStr;

      tr.appendChild(tdCaption);
      tr.appendChild(tdCenters);

      tbody.appendChild(tr);
    });
  }

  // 5) v4_negative_prompt
  if (currentExifData.v4_negative_prompt) {
    const v4NegSection = document.getElementById("v4NegativePromptSection");
    v4NegSection.style.display = "block";

    const v4NegPrompt = currentExifData.v4_negative_prompt;
    const negCaption = v4NegPrompt.caption || {};
    document.getElementById("v4NegBaseCaption").value =
      negCaption.base_caption ?? "";
    document.getElementById("v4NegUseCoords").value =
      v4NegPrompt.use_coords ?? "";
    document.getElementById("v4NegUseOrder").value =
      v4NegPrompt.use_order ?? "";

    // negative char_captions 테이블
    const negCharCaptions = negCaption.char_captions || [];
    const negTbody = document
      .getElementById("v4NegCharCaptionsTable")
      .querySelector("tbody");
    negTbody.innerHTML = "";
    negCharCaptions.forEach((item) => {
      const tr = document.createElement("tr");

      // char_caption
      const tdCaption = document.createElement("td");
      tdCaption.textContent = item.char_caption ?? "";

      // centers
      const centersArray = item.centers || [];
      const centersStr = centersArray
        .map((c) => `(${c.x}, ${c.y})`)
        .join(", ");
      const tdCenters = document.createElement("td");
      tdCenters.textContent = centersStr;

      tr.appendChild(tdCaption);
      tr.appendChild(tdCenters);

      negTbody.appendChild(tr);
    });
  }

  // 6) Raw data
  document.getElementById("rawData").value = JSON.stringify(
    currentExifData,
    null,
    2
  );

  await chrome.storage.local.set({ currentExifData: {} });
});
