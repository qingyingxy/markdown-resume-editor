const EXAMPLE_MARKDOWN = `# 示例同学

**电话**：138-XXXX-XXXX | **邮箱**：student@example.com | **主页**：[作品集](https://example.com)

%% 本文件中的人物、学校、公司和经历均为虚构，仅用于演示排版。

## 教育经历

**示例大学 · 计算机科学与技术 · 本科**
~ 2022.09-2026.06

核心课程：数据结构、操作系统、计算机网络、数据库原理。

## 实习经历

**示例科技有限公司**
~ 前端开发实习生
~ 2025.06-2025.09

- 参与内部管理页面开发，完成表单、列表和详情页的交互。
- 与后端协作对接接口，处理加载状态、空数据和请求失败提示。

## 项目经验

**Markdown 简历编辑器**
~ 个人练习项目
~ 2025.10-2025.12

**技术栈**

HTML、CSS、JavaScript、浏览器文件读写接口。

- 将 Markdown 内容实时渲染为 A4 简历，支持标题、列表、链接和分栏排版。
- 提供字体、字号、主题色与间距设置，通过浏览器打印导出 PDF。

---

**个人作品集网站**
~ [项目链接](https://example.com)

- 使用响应式布局展示项目介绍、技术栈与作品链接。
- 针对不同屏幕尺寸调整内容排列与文字换行。

## 技能

- 熟悉 HTML、CSS 与 JavaScript，能够实现常见页面交互。
- 掌握 Git 基本操作，了解 HTTP 与 REST API。

## 补充说明

请将示例内容替换为自己的真实经历。使用反引号添加标签，例如 \`JavaScript\`、\`前端开发\`。
`;

const DEFAULT_SETTINGS = {
  marginX: 45,
  marginY: 50,
  scaleMode: "auto",
  manualScale: 100,
  themeColor: "#377BB5",
  baseFontSize: 13.5,
  headingFontSize: 18,
  entryTitleFontSize: 14,
  nameFontSize: 28,
  lineHeight: 1.38,
  paragraphGap: 2,
  sectionGap: 8,
  listItemGap: 0,
  projectGap: 6,
  normalTextDepth: 12,
  bodyBold: false,
  fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif',
};

const RESUME_PRESETS = {
  ohmycv: { ...DEFAULT_SETTINGS },
  compact: {
    ...DEFAULT_SETTINGS,
    marginX: 48,
    marginY: 36,
    themeColor: "#000000",
    baseFontSize: 13,
    headingFontSize: 15,
    entryTitleFontSize: 13.5,
    nameFontSize: 22,
    lineHeight: 1.32,
    paragraphGap: 1,
    sectionGap: 6,
    projectGap: 4,
    normalTextDepth: 18,
  },
};

const DENSITY_PRESETS = {
  compact: { lineHeight: 1.32, paragraphGap: 1 },
  standard: { lineHeight: 1.38, paragraphGap: 2 },
  relaxed: { lineHeight: 1.48, paragraphGap: 4 },
};

const MIN_FIT_SCALE = 0.8;
const MIN_EFFECTIVE_FONT_SIZE = 12;
const FIT_SAFETY_PX = 2;
const FIT_SEARCH_STEPS = 14;
const PREVIEW_ZOOM = {
  min: 0.32,
  max: 1.25,
};
const PANEL_LAYOUT = {
  breakpoint: 1100,
  editorMin: 280,
  controlMin: 260,
  controlMax: 420,
  previewMin: 320,
};

const STORAGE_KEYS = {
  settings: "resume-template-settings-ohmycv-v2",
  panelLayout: "resume-template-panel-layout-v1",
};

const FILE_HANDLE_DATABASE = {
  name: "resume-template-files",
  version: 1,
  store: "handles",
  lastMarkdownKey: "last-markdown-file",
};

let isLoadingMarkdown = false;
let markdownFileHandle = null;
let lastMarkdownFileHandle = null;
let lastKnownFileModified = 0;
let pendingSaveTimer = null;
let hasPendingLocalSave = false;
let isWritingMarkdown = false;
let fitAnimationFrame = null;
let activeScaleMode = DEFAULT_SETTINGS.scaleMode;
let activeThemeColor = DEFAULT_SETTINGS.themeColor;
let renderedEditorLineCount = 0;
let activeEditorLine = 0;
let editorLineHeights = [];
let measuredEditorWidth = 0;
let editorIndicatorAnimationFrame = null;
let previewZoomAnimationFrame = null;
let editorResizeObserver = null;

const els = {
  shell: document.querySelector(".app-shell"),
  editorPanel: document.querySelector("#editorPanel"),
  previewPane: document.querySelector("#previewPane"),
  controlPanel: document.querySelector("#controlPanel"),
  panelResizers: Array.from(document.querySelectorAll(".panel-resizer")),
  previewStage: document.querySelector("#previewStage"),
  preview: document.querySelector("#resumePreview"),
  markdown: document.querySelector("#markdownInput"),
  lineNumbers: document.querySelector("#markdownLineNumbers"),
  lineMeasure: document.querySelector("#markdownLineMeasure"),
  markdownLineCount: document.querySelector("#markdownLineCount"),
  cursorPosition: document.querySelector("#cursorPosition"),
  printBtn: document.querySelector("#printBtn"),
  ohMyCvPresetBtn: document.querySelector("#ohMyCvPresetBtn"),
  compactPresetBtn: document.querySelector("#compactPresetBtn"),
  resetSettingsBtn: document.querySelector("#resetSettingsBtn"),
  reopenLastMdBtn: document.querySelector("#reopenLastMdBtn"),
  openMdBtn: document.querySelector("#openMdBtn"),
  fileStatus: document.querySelector("#fileStatus"),
  marginX: document.querySelector("#marginX"),
  marginY: document.querySelector("#marginY"),
  autoScaleBtn: document.querySelector("#autoScaleBtn"),
  manualScaleBtn: document.querySelector("#manualScaleBtn"),
  manualScale: document.querySelector("#manualScale"),
  manualScaleControl: document.querySelector("#manualScaleControl"),
  fitStatus: document.querySelector("#fitStatus"),
  themeColor: document.querySelector("#themeColor"),
  themeColorHex: document.querySelector("#themeColorHex"),
  themeSwatches: Array.from(document.querySelectorAll(".theme-swatch")),
  baseFontSize: document.querySelector("#baseFontSize"),
  headingFontSize: document.querySelector("#headingFontSize"),
  entryTitleFontSize: document.querySelector("#entryTitleFontSize"),
  nameFontSize: document.querySelector("#nameFontSize"),
  lineHeight: document.querySelector("#lineHeight"),
  paragraphGap: document.querySelector("#paragraphGap"),
  sectionGap: document.querySelector("#sectionGap"),
  listItemGap: document.querySelector("#listItemGap"),
  projectGap: document.querySelector("#projectGap"),
  densityButtons: Array.from(document.querySelectorAll(".density-button")),
  normalTextDepth: document.querySelector("#normalTextDepth"),
  bodyBold: document.querySelector("#bodyBold"),
  fontFamily: document.querySelector("#fontFamily"),
};

const outputs = {
  marginX: document.querySelector("#marginXValue"),
  marginY: document.querySelector("#marginYValue"),
  fitScale: document.querySelector("#fitScaleValue"),
  manualScale: document.querySelector("#manualScaleValue"),
  baseFontSize: document.querySelector("#baseFontSizeValue"),
  headingFontSize: document.querySelector("#headingFontSizeValue"),
  entryTitleFontSize: document.querySelector("#entryTitleFontSizeValue"),
  nameFontSize: document.querySelector("#nameFontSizeValue"),
  lineHeight: document.querySelector("#lineHeightValue"),
  paragraphGap: document.querySelector("#paragraphGapValue"),
  sectionGap: document.querySelector("#sectionGapValue"),
  listItemGap: document.querySelector("#listItemGapValue"),
  projectGap: document.querySelector("#projectGapValue"),
  normalTextDepth: document.querySelector("#normalTextDepthValue"),
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(text) {
  const placeholders = [];
  let safe = escapeHtml(text);

  safe = safe.replace(/`([^`]+)`/g, (_, label) => {
    const token = `@@INLINE_${placeholders.length}@@`;
    placeholders.push(`<span class="tag">${label}</span>`);
    return token;
  });

  safe = safe.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => {
    const token = `@@INLINE_${placeholders.length}@@`;
    placeholders.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    return token;
  });

  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  placeholders.forEach((html, index) => {
    safe = safe.replace(`@@INLINE_${index}@@`, html);
  });

  return safe;
}

function stripOuterBold(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^\*\*(.*)\*\*$/);
  return match ? match[1].trim() : trimmed;
}

function splitTrailingDate(text) {
  const cleaned = stripOuterBold(text);
  const datePattern = /\s*([（(]\s*(?:\d{4}\.\d{2}|至今|现在|Present|present)\s*[-~至]\s*(?:\d{4}\.\d{2}|至今|现在|Present|present)\s*[）)])\s*$/;
  const match = cleaned.match(datePattern);

  if (!match) {
    return null;
  }

  return {
    main: cleaned.slice(0, match.index).trim(),
    date: match[1].trim(),
  };
}

function isStrongOnlyLine(line) {
  return /^\*\*.+\*\*$/.test(line.trim());
}

function renderDatedLine(line) {
  const parts = splitTrailingDate(line);
  if (!parts) {
    return null;
  }

  return `<div class="entry-row"><div class="entry-main">${renderInline(parts.main)}</div><time class="entry-date">${escapeHtml(parts.date)}</time></div>`;
}

function parseDefinitionMarker(line) {
  const match = line.match(/^~\s*(.+)$/);
  return match ? match[1].trim() : null;
}

function canStartDefinitionRow(line) {
  return !/^(?:#{1,6}\s|---$|\d+\.\s|[-*]\s|~)/.test(line);
}

function renderDefinitionRow(term, definitions) {
  const items = definitions.map((definition) => `<dd>${renderInline(definition)}</dd>`).join("");
  return `<dl class="definition-row"><dt>${renderInline(term)}</dt>${items}</dl>`;
}

function closeList(state, html) {
  if (!state.listType) {
    return;
  }
  html.push(`</${state.listType}>`);
  state.listType = null;
}

function renderBodyLine(line) {
  const dated = renderDatedLine(line);
  if (dated) {
    return dated;
  }

  if (isStrongOnlyLine(line)) {
    const label = stripOuterBold(line);
    if (/^(项目描述|主要工作|项目职责|技术栈|项目亮点|成果)[:：]?$/.test(label)) {
      return `<h4>${renderInline(label)}</h4>`;
    }
    return `<h3>${renderInline(label)}</h3>`;
  }

  return `<p>${renderInline(line)}</p>`;
}

function renderMarkdown(markdown) {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("%%"));
  const html = [];
  const state = { listType: null, inSection: false, headerComplete: false };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trim();

    if (!line) {
      closeList(state, html);
      continue;
    }

    if (line.startsWith("# ")) {
      closeList(state, html);
      if (state.inSection) {
        html.push("</section>");
        state.inSection = false;
      }
      html.push(`<header class="resume-header"><h1>${renderInline(line.slice(2).trim())}</h1>`);
      state.headerComplete = false;
      continue;
    }

    if (line.startsWith("## ")) {
      closeList(state, html);
      if (!state.headerComplete) {
        html.push("</header>");
        state.headerComplete = true;
      }
      if (state.inSection) {
        html.push("</section>");
      }
      html.push(`<section class="section"><h2 class="section-title">${renderInline(line.slice(3).trim())}</h2>`);
      state.inSection = true;
      continue;
    }

    if (line.startsWith("### ")) {
      closeList(state, html);
      if (!state.headerComplete) {
        html.push("</header>");
        state.headerComplete = true;
      }
      html.push(`<h3>${renderInline(line.slice(4).trim())}</h3>`);
      continue;
    }

    if (line === "---") {
      closeList(state, html);
      html.push('<hr class="project-separator" />');
      continue;
    }

    if (!state.headerComplete && !state.inSection) {
      html.push(`<p>${renderInline(line)}</p></header>`);
      state.headerComplete = true;
      continue;
    }

    if (canStartDefinitionRow(line)) {
      const definitions = [];
      let nextLineIndex = lineIndex + 1;

      while (nextLineIndex < lines.length) {
        const definition = parseDefinitionMarker(lines[nextLineIndex].trim());
        if (definition === null) {
          break;
        }
        definitions.push(definition);
        nextLineIndex += 1;
      }

      if (definitions.length > 0) {
        closeList(state, html);
        html.push(renderDefinitionRow(line, definitions));
        lineIndex = nextLineIndex - 1;
        continue;
      }
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (ordered || unordered) {
      const listType = ordered ? "ol" : "ul";
      if (state.listType !== listType) {
        closeList(state, html);
        html.push(`<${listType}>`);
        state.listType = listType;
      }
      html.push(`<li>${renderInline((ordered || unordered)[1])}</li>`);
      continue;
    }

    closeList(state, html);
    html.push(renderBodyLine(line));
  }

  closeList(state, html);
  if (!state.headerComplete) {
    html.push("</header>");
  }
  if (state.inSection) {
    html.push("</section>");
  }

  return html.join("");
}

function normalTextColor(depth) {
  const lightness = 4 + depth * 0.68;
  return `hsl(210 19% ${lightness.toFixed(1)}%)`;
}

function normalizeHexColor(value, fallback = null) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
}

function updateThemeControls(color) {
  const normalized = normalizeHexColor(color, DEFAULT_SETTINGS.themeColor);
  activeThemeColor = normalized;
  els.themeColor.value = normalized;
  els.themeColorHex.value = normalized;
  els.themeColorHex.setAttribute("aria-invalid", "false");

  els.themeSwatches.forEach((button) => {
    const isActive = button.dataset.themeColor.toUpperCase() === normalized;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateDensityControls() {
  const lineHeight = Number(els.lineHeight.value);
  const paragraphGap = Number(els.paragraphGap.value);

  els.densityButtons.forEach((button) => {
    const preset = DENSITY_PRESETS[button.dataset.density];
    const isActive = preset
      && Math.abs(preset.lineHeight - lineHeight) < 0.001
      && preset.paragraphGap === paragraphGap;
    button.classList.toggle("is-active", Boolean(isActive));
    button.setAttribute("aria-pressed", String(Boolean(isActive)));
  });
}

function clampScale(scale) {
  return Math.min(1, Math.max(MIN_FIT_SCALE, scale));
}

function formatScale(scale) {
  const percentage = scale * 100;
  return `${percentage >= 99.95 ? "100" : percentage.toFixed(1)}%`;
}

function applyContentScale(scale) {
  const normalized = clampScale(scale);
  document.documentElement.style.setProperty("--fit-scale", normalized.toFixed(4));
  return normalized;
}

function measureAtScale(content, scale) {
  const normalized = applyContentScale(scale);
  const layoutHeight = content.scrollHeight;

  return {
    scale: normalized,
    renderedHeight: layoutHeight * normalized,
  };
}

function updateFitStatus(scale, overflow, hasContent) {
  outputs.fitScale.textContent = formatScale(scale);

  if (!hasContent) {
    els.fitStatus.dataset.state = "idle";
    els.fitStatus.textContent = "等待内容";
    return;
  }

  const effectiveFontSize = Number(els.baseFontSize.value) * scale;
  const fontSummary = `正文实际 ${effectiveFontSize.toFixed(1)}px`;

  if (overflow > 0.5) {
    els.fitStatus.dataset.state = "warning";
    const suffix = activeScaleMode === "manual" ? "已锁定" : "已达自动下限";
    els.fitStatus.textContent = `内容超出 ${Math.ceil(overflow)}px · ${suffix} · ${fontSummary}`;
    return;
  }

  if (effectiveFontSize < MIN_EFFECTIVE_FONT_SIZE) {
    els.fitStatus.dataset.state = "warning";
    els.fitStatus.textContent = `适合一页 · ${fontSummary} · 建议精简内容`;
    return;
  }

  els.fitStatus.dataset.state = "ok";
  const modeSummary = activeScaleMode === "manual" ? "已锁定" : "自动适配";
  els.fitStatus.textContent = `适合一页 · ${modeSummary} · ${fontSummary}`;
}

function fitToOnePageNow() {
  if (fitAnimationFrame !== null) {
    cancelAnimationFrame(fitAnimationFrame);
    fitAnimationFrame = null;
  }

  const content = els.preview.querySelector(".resume-content");
  if (!content) {
    return;
  }

  const pageStyle = getComputedStyle(els.preview);
  const availableHeight = Math.max(
    0,
    els.preview.clientHeight - parseFloat(pageStyle.paddingTop) - parseFloat(pageStyle.paddingBottom) - FIT_SAFETY_PX,
  );
  const hasContent = Boolean(els.markdown.value.trim());

  if (!hasContent || availableHeight <= 0) {
    const idleScale = activeScaleMode === "manual" ? Number(els.manualScale.value) / 100 : 1;
    const normalized = applyContentScale(idleScale);
    updateFitStatus(normalized, 0, false);
    return;
  }

  if (activeScaleMode === "manual") {
    const measurement = measureAtScale(content, Number(els.manualScale.value) / 100);
    updateFitStatus(measurement.scale, Math.max(0, measurement.renderedHeight - availableHeight), true);
    return;
  }

  let finalMeasurement = measureAtScale(content, 1);

  if (finalMeasurement.renderedHeight > availableHeight) {
    const minimumMeasurement = measureAtScale(content, MIN_FIT_SCALE);

    if (minimumMeasurement.renderedHeight > availableHeight) {
      finalMeasurement = minimumMeasurement;
    } else {
      let lowerBound = MIN_FIT_SCALE;
      let upperBound = 1;

      for (let index = 0; index < FIT_SEARCH_STEPS; index += 1) {
        const candidate = (lowerBound + upperBound) / 2;
        const measurement = measureAtScale(content, candidate);

        if (measurement.renderedHeight <= availableHeight) {
          lowerBound = candidate;
        } else {
          upperBound = candidate;
        }
      }

      finalMeasurement = measureAtScale(content, lowerBound);
    }
  }

  updateFitStatus(
    finalMeasurement.scale,
    Math.max(0, finalMeasurement.renderedHeight - availableHeight),
    true,
  );
}

function scheduleFitToOnePage() {
  if (fitAnimationFrame !== null) {
    cancelAnimationFrame(fitAnimationFrame);
  }

  fitAnimationFrame = requestAnimationFrame(() => {
    fitAnimationFrame = null;
    fitToOnePageNow();
  });
}

function updatePreviewZoom() {
  if (
    typeof els.previewPane?.getBoundingClientRect !== "function"
    || typeof els.preview?.getBoundingClientRect !== "function"
    || !els.previewStage
  ) {
    return;
  }

  const paneStyle = getComputedStyle(els.previewPane);
  const availableWidth = Math.max(
    1,
    els.previewPane.clientWidth - parseFloat(paneStyle.paddingLeft) - parseFloat(paneStyle.paddingRight),
  );
  const pageWidth = els.preview.offsetWidth;
  const pageHeight = els.preview.offsetHeight;
  if (pageWidth <= 0 || pageHeight <= 0) {
    return;
  }

  const scale = Math.min(PREVIEW_ZOOM.max, Math.max(PREVIEW_ZOOM.min, availableWidth / pageWidth));
  els.previewStage.style.width = `${pageWidth * scale}px`;
  els.previewStage.style.height = `${pageHeight * scale}px`;
  els.preview.style.transform = `scale(${scale})`;
}

function schedulePreviewZoom() {
  if (previewZoomAnimationFrame !== null) {
    cancelAnimationFrame(previewZoomAnimationFrame);
  }
  previewZoomAnimationFrame = requestAnimationFrame(() => {
    previewZoomAnimationFrame = null;
    updatePreviewZoom();
  });
}

function setStatus(message) {
  els.fileStatus.textContent = message;
}

function renderPreview() {
  els.preview.innerHTML = `<div class="resume-content">${renderMarkdown(els.markdown.value)}</div>`;
}

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function getCurrentSettings() {
  return {
    marginX: Number(els.marginX.value),
    marginY: Number(els.marginY.value),
    scaleMode: activeScaleMode,
    manualScale: Number(els.manualScale.value),
    themeColor: activeThemeColor,
    baseFontSize: Number(els.baseFontSize.value),
    headingFontSize: Number(els.headingFontSize.value),
    entryTitleFontSize: Number(els.entryTitleFontSize.value),
    nameFontSize: Number(els.nameFontSize.value),
    lineHeight: Number(els.lineHeight.value),
    paragraphGap: Number(els.paragraphGap.value),
    sectionGap: Number(els.sectionGap.value),
    listItemGap: Number(els.listItemGap.value),
    projectGap: Number(els.projectGap.value),
    normalTextDepth: Number(els.normalTextDepth.value),
    bodyBold: els.bodyBold.checked,
    fontFamily: els.fontFamily.value,
  };
}

function applySettings(settings) {
  document.documentElement.style.setProperty("--theme-color", normalizeHexColor(settings.themeColor, DEFAULT_SETTINGS.themeColor));
  document.documentElement.style.setProperty("--page-margin-x", `${settings.marginX}px`);
  document.documentElement.style.setProperty("--page-margin-y", `${settings.marginY}px`);
  document.documentElement.style.setProperty("--base-font-size", `${settings.baseFontSize}px`);
  document.documentElement.style.setProperty("--heading-font-size", `${settings.headingFontSize}px`);
  document.documentElement.style.setProperty("--entry-title-font-size", `${settings.entryTitleFontSize}px`);
  document.documentElement.style.setProperty("--name-font-size", `${settings.nameFontSize}px`);
  document.documentElement.style.setProperty("--line-height", settings.lineHeight);
  document.documentElement.style.setProperty("--paragraph-gap", `${settings.paragraphGap}px`);
  document.documentElement.style.setProperty("--section-gap", `${settings.sectionGap}px`);
  document.documentElement.style.setProperty("--list-item-gap", `${settings.listItemGap}px`);
  document.documentElement.style.setProperty("--project-gap", `${settings.projectGap}px`);
  document.documentElement.style.setProperty("--resume-font-family", settings.fontFamily);
  document.documentElement.style.setProperty("--body-font-weight", settings.bodyBold ? "500" : "400");
  document.documentElement.style.setProperty("--normal-text-color", normalTextColor(settings.normalTextDepth));

  outputs.marginX.textContent = `${settings.marginX}px`;
  outputs.marginY.textContent = `${settings.marginY}px`;
  outputs.manualScale.textContent = `${settings.manualScale.toFixed(1)}%`;
  outputs.baseFontSize.textContent = `${settings.baseFontSize}px`;
  outputs.headingFontSize.textContent = `${settings.headingFontSize}px`;
  outputs.entryTitleFontSize.textContent = `${settings.entryTitleFontSize}px`;
  outputs.nameFontSize.textContent = `${settings.nameFontSize}px`;
  outputs.lineHeight.textContent = settings.lineHeight.toFixed(2);
  outputs.paragraphGap.textContent = `${settings.paragraphGap}px`;
  outputs.sectionGap.textContent = `${settings.sectionGap}px`;
  outputs.listItemGap.textContent = `${settings.listItemGap}px`;
  outputs.projectGap.textContent = `${settings.projectGap}px`;
  outputs.normalTextDepth.textContent = `${settings.normalTextDepth}%`;
}

function updateScaleModeControls() {
  const isManual = activeScaleMode === "manual";

  els.autoScaleBtn.classList.toggle("is-active", !isManual);
  els.autoScaleBtn.setAttribute("aria-pressed", String(!isManual));
  els.manualScaleBtn.classList.toggle("is-active", isManual);
  els.manualScaleBtn.setAttribute("aria-pressed", String(isManual));
  els.manualScale.disabled = !isManual;
  els.manualScaleControl.classList.toggle("is-disabled", !isManual);
}

function syncControls(settings) {
  activeScaleMode = settings.scaleMode === "manual" ? "manual" : "auto";
  settings.manualScale = Math.min(100, Math.max(MIN_FIT_SCALE * 100, Number(settings.manualScale)));

  Object.entries(settings).forEach(([key, value]) => {
    if (key === "bodyBold") {
      els.bodyBold.checked = Boolean(value);
    } else if (els[key]) {
      els[key].value = value;
    }
  });

  updateThemeControls(settings.themeColor);
  updateScaleModeControls();
  updateDensityControls();
}

function syncEditorScroll() {
  els.lineNumbers.scrollTop = els.markdown.scrollTop;
}

function measureWrappedLineHeights(lines) {
  if (
    typeof els.markdown?.getBoundingClientRect !== "function"
    || !els.lineMeasure
    || typeof els.lineMeasure.querySelectorAll !== "function"
  ) {
    return [];
  }

  const editorStyle = getComputedStyle(els.markdown);
  const contentWidth = Math.max(
    1,
    els.markdown.clientWidth - parseFloat(editorStyle.paddingLeft) - parseFloat(editorStyle.paddingRight),
  );
  els.lineMeasure.style.width = `${contentWidth}px`;
  els.lineMeasure.style.fontFamily = editorStyle.fontFamily;
  els.lineMeasure.style.fontSize = editorStyle.fontSize;
  els.lineMeasure.style.fontWeight = editorStyle.fontWeight;
  els.lineMeasure.style.fontStyle = editorStyle.fontStyle;
  els.lineMeasure.style.lineHeight = editorStyle.lineHeight;
  els.lineMeasure.style.letterSpacing = editorStyle.letterSpacing;
  els.lineMeasure.style.tabSize = editorStyle.tabSize;
  els.lineMeasure.innerHTML = lines.map((line) => {
    const content = line.length > 0 ? escapeHtml(line) : "&#8203;";
    return `<span class="markdown-line-measure-line">${content}</span>`;
  }).join("");

  const minimumLineHeight = parseFloat(editorStyle.lineHeight) || 22;
  return Array.from(els.lineMeasure.querySelectorAll(".markdown-line-measure-line"), (line) => {
    return Math.max(minimumLineHeight, line.getBoundingClientRect().height);
  });
}

function updateEditorIndicators({ remeasure = false } = {}) {
  const lines = els.markdown.value.split("\n");
  const lineCount = lines.length;
  const beforeCursor = els.markdown.value.slice(0, els.markdown.selectionStart);
  const currentLine = beforeCursor.split("\n").length;
  const lastLineBreak = beforeCursor.lastIndexOf("\n");
  const currentColumn = els.markdown.selectionStart - lastLineBreak;
  const editorWidth = Number(els.markdown.clientWidth) || 0;
  const widthChanged = Math.abs(editorWidth - measuredEditorWidth) > 0.5;

  if (remeasure || widthChanged || lineCount !== renderedEditorLineCount) {
    editorLineHeights = measureWrappedLineHeights(lines);
    measuredEditorWidth = editorWidth;
  }

  if (remeasure || widthChanged || lineCount !== renderedEditorLineCount || currentLine !== activeEditorLine) {
    els.lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, index) => {
      const lineNumber = index + 1;
      const activeClass = lineNumber === currentLine ? " is-active" : "";
      const measuredHeight = editorLineHeights[index];
      const heightStyle = Number.isFinite(measuredHeight) ? ` style="height: ${measuredHeight.toFixed(3)}px"` : "";
      return `<span class="editor-line-number${activeClass}"${heightStyle}>${lineNumber}</span>`;
    }).join("");
    renderedEditorLineCount = lineCount;
    activeEditorLine = currentLine;
  }

  els.markdownLineCount.textContent = `${lineCount} 行`;
  els.cursorPosition.textContent = `Ln ${currentLine}, Col ${currentColumn}`;
  syncEditorScroll();
}

function scheduleEditorIndicatorUpdate() {
  if (editorIndicatorAnimationFrame !== null) {
    cancelAnimationFrame(editorIndicatorAnimationFrame);
  }
  editorIndicatorAnimationFrame = requestAnimationFrame(() => {
    editorIndicatorAnimationFrame = null;
    updateEditorIndicators({ remeasure: true });
  });
}

function initializeEditorResizeObserver() {
  if (!window.ResizeObserver || typeof els.markdown?.getBoundingClientRect !== "function") {
    return;
  }
  editorResizeObserver = new ResizeObserver(scheduleEditorIndicatorUpdate);
  editorResizeObserver.observe(els.markdown);
}

function loadMarkdown(markdown, status) {
  isLoadingMarkdown = true;
  els.markdown.value = markdown;
  updateEditorIndicators({ remeasure: true });
  renderPreview();
  scheduleFitToOnePage();
  setStatus(status);
  isLoadingMarkdown = false;
}

function loadInitialMarkdown() {
  loadMarkdown(EXAMPLE_MARKDOWN, "已载入虚构示例，可直接编辑预览。选择自己的 MD 文件后，修改会自动保存。");
}

function openFileHandleDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(FILE_HANDLE_DATABASE.name, FILE_HANDLE_DATABASE.version);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_HANDLE_DATABASE.store)) {
        database.createObjectStore(FILE_HANDLE_DATABASE.store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("文件记录数据库被其他页面占用"));
  });
}

async function saveLastMarkdownFileHandle(handle) {
  let database;
  try {
    database = await openFileHandleDatabase();
    if (!database) {
      return false;
    }

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(FILE_HANDLE_DATABASE.store, "readwrite");
      transaction.objectStore(FILE_HANDLE_DATABASE.store).put(handle, FILE_HANDLE_DATABASE.lastMarkdownKey);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("保存文件记录失败"));
    });
    return true;
  } catch (error) {
    console.warn("无法记住上次选择的 Markdown 文件：", error);
    return false;
  } finally {
    database?.close();
  }
}

async function readLastMarkdownFileHandle() {
  let database;
  try {
    database = await openFileHandleDatabase();
    if (!database) {
      return null;
    }

    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(FILE_HANDLE_DATABASE.store, "readonly");
      const request = transaction.objectStore(FILE_HANDLE_DATABASE.store).get(FILE_HANDLE_DATABASE.lastMarkdownKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("无法读取上次选择的 Markdown 文件：", error);
    return null;
  } finally {
    database?.close();
  }
}

function updateLastMarkdownButton(handle) {
  lastMarkdownFileHandle = handle || null;
  els.reopenLastMdBtn.disabled = !lastMarkdownFileHandle;
  els.reopenLastMdBtn.title = lastMarkdownFileHandle
    ? `重新连接 ${lastMarkdownFileHandle.name}`
    : "没有上次选择的 Markdown 文件";
}

async function verifyFilePermission(handle, mode = "read") {
  if (!handle?.queryPermission) {
    return false;
  }

  const options = { mode };
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }

  return (await handle.requestPermission(options)) === "granted";
}

async function readMarkdownFile(handle = markdownFileHandle) {
  const file = await handle.getFile();
  lastKnownFileModified = file.lastModified;
  return await file.text();
}

async function bindMarkdownFile(handle, { remember = false, restored = false } = {}) {
  const markdown = await readMarkdownFile(handle);
  markdownFileHandle = handle;
  updateLastMarkdownButton(handle);

  const remembered = remember ? await saveLastMarkdownFileHandle(handle) : true;
  const action = restored ? "已自动恢复" : "已绑定";
  const persistence = remembered ? "刷新后会自动恢复。" : "浏览器未能保存最近文件记录。";
  loadMarkdown(markdown, `${action} ${handle.name}，网页修改会自动保存，外部修改会自动刷新。${persistence}`);
}

async function restoreLastMarkdownFile(requestPermission = false) {
  const handle = lastMarkdownFileHandle || await readLastMarkdownFileHandle();
  if (!handle) {
    updateLastMarkdownButton(null);
    return;
  }

  updateLastMarkdownButton(handle);

  try {
    let permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted" && requestPermission) {
      permission = await handle.requestPermission({ mode: "readwrite" });
    }

    if (permission !== "granted") {
      setStatus(`检测到上次文件 ${handle.name}，点击“上次文件”重新连接。`);
      return;
    }

    await bindMarkdownFile(handle, { restored: true });
  } catch (error) {
    markdownFileHandle = null;
    setStatus(`无法恢复 ${handle.name}：${error.message}。请重新选择文件。`);
  }
}

async function writeMarkdownFile() {
  if (!markdownFileHandle || isLoadingMarkdown) {
    return;
  }

  try {
    isWritingMarkdown = true;
    const writable = await markdownFileHandle.createWritable();
    await writable.write(els.markdown.value);
    await writable.close();

    const file = await markdownFileHandle.getFile();
    lastKnownFileModified = file.lastModified;
    hasPendingLocalSave = false;
    setStatus(`已自动保存到 ${markdownFileHandle.name}。外部修改也会自动刷新。`);
  } catch (error) {
    setStatus(`自动保存失败：${error.message}`);
  } finally {
    isWritingMarkdown = false;
  }
}

function scheduleMarkdownSave() {
  if (!markdownFileHandle || isLoadingMarkdown) {
    return;
  }

  hasPendingLocalSave = true;
  clearTimeout(pendingSaveTimer);
  setStatus(`正在等待保存到 ${markdownFileHandle.name}...`);
  pendingSaveTimer = window.setTimeout(writeMarkdownFile, 500);
}

async function pollMarkdownFile() {
  if (!markdownFileHandle || isLoadingMarkdown || isWritingMarkdown || hasPendingLocalSave) {
    return;
  }

  try {
    const file = await markdownFileHandle.getFile();
    if (file.lastModified === lastKnownFileModified) {
      return;
    }

    const markdown = await file.text();
    lastKnownFileModified = file.lastModified;
    loadMarkdown(markdown, `检测到 ${markdownFileHandle.name} 已在外部修改，已刷新。`);
  } catch (error) {
    setStatus(`检测文件变化失败：${error.message}`);
  }
}

async function openMarkdownFile() {
  if (!window.showOpenFilePicker) {
    setStatus("当前浏览器不支持自动写回文件，请使用新版 Chrome 或 Edge。");
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: "Markdown", accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] } }],
      excludeAcceptAllOption: false,
      multiple: false,
    });

    if (!(await verifyFilePermission(handle, "readwrite"))) {
      setStatus("没有文件读写权限，无法自动双向同步。");
      return;
    }

    await bindMarkdownFile(handle, { remember: true });
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(`选择失败：${error.message}`);
    }
  }
}

function renderAndPersist() {
  updateEditorIndicators({ remeasure: true });
  const settings = getCurrentSettings();
  applySettings(settings);
  renderPreview();
  scheduleFitToOnePage();
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  scheduleMarkdownSave();
}

function setScaleMode(mode) {
  if (mode === activeScaleMode) {
    return;
  }

  activeScaleMode = mode;
  updateScaleModeControls();
  renderAndPersist();
}

function setThemeColor(color) {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    els.themeColorHex.setAttribute("aria-invalid", "true");
    return false;
  }

  updateThemeControls(normalized);
  renderAndPersist();
  return true;
}

function setDensityPreset(name) {
  const preset = DENSITY_PRESETS[name];
  if (!preset) {
    return;
  }

  els.lineHeight.value = preset.lineHeight;
  els.paragraphGap.value = preset.paragraphGap;
  updateDensityControls();
  renderAndPersist();
}

function applyResumePreset(name) {
  const preset = RESUME_PRESETS[name];
  if (!preset) {
    return;
  }

  syncControls({ ...preset });
  renderAndPersist();
}

function resetSettings() {
  syncControls({ ...DEFAULT_SETTINGS });
  renderAndPersist();
}

function clampPanelWidth(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isStackedLayout() {
  return window.innerWidth <= PANEL_LAYOUT.breakpoint;
}

function getPanelMeasurements() {
  const shellStyle = getComputedStyle(els.shell);
  const horizontalPadding = parseFloat(shellStyle.paddingLeft) + parseFloat(shellStyle.paddingRight);
  const resizerWidth = els.panelResizers.reduce((total, resizer) => {
    return total + resizer.getBoundingClientRect().width;
  }, 0);

  return {
    available: els.shell.clientWidth - horizontalPadding - resizerWidth,
    editor: els.editorPanel.getBoundingClientRect().width,
    preview: els.previewPane.getBoundingClientRect().width,
    controls: els.controlPanel.getBoundingClientRect().width,
  };
}

function constrainPanelWidths(editorWidth, controlWidth) {
  const { available } = getPanelMeasurements();
  const maxControl = Math.max(
    PANEL_LAYOUT.controlMin,
    Math.min(PANEL_LAYOUT.controlMax, available - PANEL_LAYOUT.editorMin - PANEL_LAYOUT.previewMin),
  );
  const controls = clampPanelWidth(controlWidth, PANEL_LAYOUT.controlMin, maxControl);
  const maxEditor = Math.max(PANEL_LAYOUT.editorMin, available - controls - PANEL_LAYOUT.previewMin);
  const editor = clampPanelWidth(editorWidth, PANEL_LAYOUT.editorMin, maxEditor);
  return { editor, controls };
}

function updateResizerAccessibility(editorWidth, controlWidth) {
  const editorResizer = els.panelResizers.find((resizer) => resizer.dataset.resizer === "editor");
  const controlResizer = els.panelResizers.find((resizer) => resizer.dataset.resizer === "controls");
  const { available } = getPanelMeasurements();

  editorResizer?.setAttribute("aria-valuemin", String(PANEL_LAYOUT.editorMin));
  editorResizer?.setAttribute("aria-valuemax", String(Math.round(available - controlWidth - PANEL_LAYOUT.previewMin)));
  editorResizer?.setAttribute("aria-valuenow", String(Math.round(editorWidth)));
  controlResizer?.setAttribute("aria-valuemin", String(PANEL_LAYOUT.controlMin));
  controlResizer?.setAttribute("aria-valuemax", String(PANEL_LAYOUT.controlMax));
  controlResizer?.setAttribute("aria-valuenow", String(Math.round(controlWidth)));
}

function applyPanelWidths(editorWidth, controlWidth) {
  els.shell.style.setProperty("--editor-pane-width", `${Math.round(editorWidth)}px`);
  els.shell.style.setProperty("--control-pane-width", `${Math.round(controlWidth)}px`);
  updateResizerAccessibility(editorWidth, controlWidth);
  scheduleEditorIndicatorUpdate();
  schedulePreviewZoom();
}

function savePanelLayout() {
  const measurements = getPanelMeasurements();
  localStorage.setItem(STORAGE_KEYS.panelLayout, JSON.stringify({
    editorWidth: Math.round(measurements.editor),
    controlWidth: Math.round(measurements.controls),
  }));
}

function normalizePanelLayout() {
  if (isStackedLayout()) {
    return;
  }

  const current = getPanelMeasurements();
  const constrained = constrainPanelWidths(current.editor, current.controls);
  if (Math.abs(current.editor - constrained.editor) > 0.5 || Math.abs(current.controls - constrained.controls) > 0.5) {
    applyPanelWidths(constrained.editor, constrained.controls);
  } else {
    updateResizerAccessibility(current.editor, current.controls);
  }
}

function restorePanelLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.panelLayout));
    if (Number.isFinite(saved?.editorWidth) && Number.isFinite(saved?.controlWidth)) {
      const constrained = constrainPanelWidths(saved.editorWidth, saved.controlWidth);
      applyPanelWidths(constrained.editor, constrained.controls);
      return;
    }
  } catch {
    // Ignore malformed layout settings and use the CSS defaults.
  }
  normalizePanelLayout();
}

function resetPanelLayout() {
  els.shell.style.removeProperty("--editor-pane-width");
  els.shell.style.removeProperty("--control-pane-width");
  localStorage.removeItem(STORAGE_KEYS.panelLayout);
  normalizePanelLayout();
  scheduleEditorIndicatorUpdate();
  schedulePreviewZoom();
}

function resizePanels(side, delta, start) {
  if (side === "editor") {
    const maxEditor = Math.max(
      PANEL_LAYOUT.editorMin,
      start.available - start.controls - PANEL_LAYOUT.previewMin,
    );
    const editor = clampPanelWidth(start.editor + delta, PANEL_LAYOUT.editorMin, maxEditor);
    applyPanelWidths(editor, start.controls);
    return editor;
  }

  const maxControl = Math.max(
    PANEL_LAYOUT.controlMin,
    Math.min(PANEL_LAYOUT.controlMax, start.available - start.editor - PANEL_LAYOUT.previewMin),
  );
  const controls = clampPanelWidth(start.controls - delta, PANEL_LAYOUT.controlMin, maxControl);
  applyPanelWidths(start.editor, controls);
  return controls;
}

function initializePanelResizers() {
  if (typeof els.shell?.getBoundingClientRect !== "function") {
    return;
  }

  restorePanelLayout();
  els.panelResizers.forEach((resizer) => {
    resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || isStackedLayout()) {
        return;
      }

      const side = resizer.dataset.resizer;
      const startX = event.clientX;
      const start = getPanelMeasurements();
      resizer.classList.add("is-dragging");
      document.body.classList.add("is-resizing-panels");
      resizer.setPointerCapture?.(event.pointerId);

      const handleMove = (moveEvent) => {
        const width = resizePanels(side, moveEvent.clientX - startX, start);
        resizer.dataset.size = `${Math.round(width)}px`;
      };
      const handleEnd = () => {
        resizer.classList.remove("is-dragging");
        document.body.classList.remove("is-resizing-panels");
        resizer.removeEventListener("pointermove", handleMove);
        resizer.removeEventListener("pointerup", handleEnd);
        resizer.removeEventListener("pointercancel", handleEnd);
        savePanelLayout();
      };

      resizer.addEventListener("pointermove", handleMove);
      resizer.addEventListener("pointerup", handleEnd);
      resizer.addEventListener("pointercancel", handleEnd);
    });

    resizer.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const step = event.shiftKey ? 32 : 12;
      resizePanels(resizer.dataset.resizer, direction * step, getPanelMeasurements());
      savePanelLayout();
    });

    resizer.addEventListener("dblclick", resetPanelLayout);
  });
}

async function init() {
  const settings = readSettings();

  syncControls(settings);
  applySettings(settings);
  loadInitialMarkdown();
  initializePanelResizers();
  initializeEditorResizeObserver();
  schedulePreviewZoom();

  els.markdown.addEventListener("input", renderAndPersist);
  els.markdown.addEventListener("scroll", syncEditorScroll);
  ["click", "keyup", "select"].forEach((eventName) => {
    els.markdown.addEventListener(eventName, () => updateEditorIndicators());
  });
  els.printBtn.addEventListener("click", () => {
    fitToOnePageNow();
    window.print();
  });
  els.ohMyCvPresetBtn.addEventListener("click", () => applyResumePreset("ohmycv"));
  els.compactPresetBtn.addEventListener("click", () => applyResumePreset("compact"));
  els.resetSettingsBtn.addEventListener("click", resetSettings);
  els.reopenLastMdBtn.addEventListener("click", () => restoreLastMarkdownFile(true));
  els.openMdBtn.addEventListener("click", openMarkdownFile);
  els.autoScaleBtn.addEventListener("click", () => setScaleMode("auto"));
  els.manualScaleBtn.addEventListener("click", () => setScaleMode("manual"));

  els.themeSwatches.forEach((button) => {
    button.addEventListener("click", () => setThemeColor(button.dataset.themeColor));
  });
  els.themeColor.addEventListener("input", () => setThemeColor(els.themeColor.value));
  els.themeColorHex.addEventListener("input", () => {
    const normalized = normalizeHexColor(els.themeColorHex.value);
    if (!normalized) {
      els.themeColorHex.setAttribute("aria-invalid", "true");
      return;
    }
    setThemeColor(normalized);
  });
  els.themeColorHex.addEventListener("change", () => {
    if (!normalizeHexColor(els.themeColorHex.value)) {
      updateThemeControls(activeThemeColor);
    }
  });

  els.densityButtons.forEach((button) => {
    button.addEventListener("click", () => setDensityPreset(button.dataset.density));
  });
  els.bodyBold.addEventListener("change", renderAndPersist);

  ["marginX", "marginY", "manualScale", "baseFontSize", "headingFontSize", "entryTitleFontSize", "nameFontSize", "lineHeight", "paragraphGap", "sectionGap", "listItemGap", "projectGap", "normalTextDepth", "fontFamily"].forEach((key) => {
    const handleSettingChange = () => {
      if (key === "lineHeight" || key === "paragraphGap") {
        updateDensityControls();
      }
      renderAndPersist();
    };
    els[key].addEventListener("input", handleSettingChange);
    els[key].addEventListener("change", handleSettingChange);
  });

  window.addEventListener("resize", () => {
    normalizePanelLayout();
    scheduleEditorIndicatorUpdate();
    schedulePreviewZoom();
    scheduleFitToOnePage();
  });
  window.addEventListener("beforeprint", fitToOnePageNow);
  window.setInterval(pollMarkdownFile, 1000);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      scheduleEditorIndicatorUpdate();
      schedulePreviewZoom();
      scheduleFitToOnePage();
    });
  }

  await restoreLastMarkdownFile();
}

init();
