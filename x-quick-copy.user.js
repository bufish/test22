// ==UserScript==
// @name         X.com Quick Copy Panel
// @namespace    https://github.com/example/x-quick-copy
// @version      1.0.0
// @description  在 X.com 右上角提供可自定义的一键复制工具，支持添加、编辑和删除多条文本。
// @author       Your Name
// @match        https://x.com/*
// @match        https://www.x.com/*
// @match        https://twitter.com/*
// @match        https://www.twitter.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'x_quick_copy_items_v1';

    function loadSnippets() {
        try {
            const saved = GM_getValue(STORAGE_KEY);
            if (Array.isArray(saved)) {
                return saved;
            }
        } catch (err) {
            console.error('Failed to read stored snippets', err);
        }
        return [];
    }

    function saveSnippets(items) {
        try {
            GM_setValue(STORAGE_KEY, items);
        } catch (err) {
            console.error('Failed to save snippets', err);
        }
    }

    function createElement(tag, className, textContent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        return el;
    }

    function showToast(message) {
        const toast = createElement('div', 'xqc-toast', message);
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, 2200);
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('已复制到剪贴板');
        } catch (err) {
            console.error('Clipboard copy failed', err);
            showToast('复制失败，请检查权限');
        }
    }

    function buildUI() {
        const container = createElement('div', 'xqc-container');
        const header = createElement('div', 'xqc-header');
        const title = createElement('div', 'xqc-title', '快捷复制');
        const toggle = createElement('button', 'xqc-toggle', '—');
        header.appendChild(title);
        header.appendChild(toggle);

        const list = createElement('div', 'xqc-list');
        const empty = createElement('div', 'xqc-empty', '暂无自定义文本，添加后即可一键复制。');
        list.appendChild(empty);

        const form = createElement('form', 'xqc-form');
        const nameInput = createElement('input');
        nameInput.placeholder = '名称（可选，默认为文本前几字）';
        const textInput = createElement('textarea');
        textInput.placeholder = '要复制的文本';
        const submitBtn = createElement('button', 'xqc-primary', '添加/保存');
        submitBtn.type = 'submit';
        const resetBtn = createElement('button', 'xqc-secondary', '清空');
        resetBtn.type = 'button';
        form.append(nameInput, textInput, submitBtn, resetBtn);

        const footer = createElement('div', 'xqc-footer');
        footer.textContent = '保存的内容仅存于浏览器本地。';

        container.append(header, list, form, footer);
        document.body.appendChild(container);

        let snippets = loadSnippets();
        let editingId = null;

        function renderList() {
            list.innerHTML = '';
            if (!snippets.length) {
                list.appendChild(empty);
                return;
            }

            snippets.forEach((item) => {
                const row = createElement('div', 'xqc-row');
                const label = createElement('div', 'xqc-label');
                label.textContent = item.name || item.text.slice(0, 18) || '未命名';

                const actions = createElement('div', 'xqc-actions');
                const copyBtn = createElement('button', 'xqc-primary xqc-small', '复制');
                copyBtn.addEventListener('click', () => copyText(item.text));

                const editBtn = createElement('button', 'xqc-secondary xqc-small', '编辑');
                editBtn.addEventListener('click', () => {
                    editingId = item.id;
                    nameInput.value = item.name || '';
                    textInput.value = item.text;
                    submitBtn.textContent = '保存修改';
                });

                const deleteBtn = createElement('button', 'xqc-danger xqc-small', '删除');
                deleteBtn.addEventListener('click', () => {
                    snippets = snippets.filter((s) => s.id !== item.id);
                    saveSnippets(snippets);
                    renderList();
                    if (editingId === item.id) {
                        resetForm();
                    }
                });

                actions.append(copyBtn, editBtn, deleteBtn);
                row.append(label, actions);
                list.appendChild(row);
            });
        }

        function resetForm() {
            editingId = null;
            nameInput.value = '';
            textInput.value = '';
            submitBtn.textContent = '添加/保存';
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const text = textInput.value.trim();
            const name = nameInput.value.trim();
            if (!text) {
                showToast('请输入要复制的文本');
                return;
            }

            if (editingId) {
                snippets = snippets.map((item) => item.id === editingId ? { ...item, name, text } : item);
                showToast('内容已更新');
            } else {
                snippets.push({
                    id: crypto.randomUUID(),
                    name,
                    text,
                });
                showToast('已添加');
            }

            saveSnippets(snippets);
            renderList();
            resetForm();
        });

        resetBtn.addEventListener('click', () => resetForm());

        toggle.addEventListener('click', () => {
            container.classList.toggle('xqc-collapsed');
            toggle.textContent = container.classList.contains('xqc-collapsed') ? '+' : '—';
        });

        renderList();
    }

    GM_addStyle(`
      .xqc-container {
        position: fixed;
        top: 12px;
        right: 12px;
        width: 320px;
        max-height: 80vh;
        background: rgba(24, 26, 27, 0.92);
        color: #f0f6ff;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        z-index: 99999;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .xqc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .xqc-title {
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .xqc-toggle {
        background: transparent;
        color: inherit;
        border: none;
        width: 24px;
        height: 24px;
        font-size: 18px;
        cursor: pointer;
        border-radius: 6px;
      }

      .xqc-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px 12px;
        gap: 8px;
        display: flex;
        flex-direction: column;
      }

      .xqc-row {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .xqc-label {
        font-size: 14px;
        word-break: break-all;
      }

      .xqc-actions {
        display: flex;
        gap: 6px;
      }

      .xqc-actions button {
        border: none;
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 12px;
      }

      .xqc-small {
        padding: 4px 9px;
      }

      .xqc-primary {
        background: #1d9bf0;
        color: white;
      }

      .xqc-secondary {
        background: rgba(255, 255, 255, 0.14);
        color: white;
      }

      .xqc-danger {
        background: #f4212e;
        color: white;
      }

      .xqc-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
      }

      .xqc-form input,
      .xqc-form textarea {
        width: 100%;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.06);
        color: white;
        padding: 8px 10px;
        resize: vertical;
        min-height: 36px;
        font-size: 14px;
      }

      .xqc-form textarea {
        min-height: 76px;
      }

      .xqc-form button {
        border: none;
        border-radius: 8px;
        padding: 9px 12px;
        cursor: pointer;
        font-size: 14px;
      }

      .xqc-footer {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.75);
        padding: 8px 12px 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .xqc-empty {
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
      }

      .xqc-collapsed .xqc-list,
      .xqc-collapsed .xqc-form,
      .xqc-collapsed .xqc-footer {
        display: none;
      }

      .xqc-toast {
        position: fixed;
        top: 20px;
        right: 50%;
        transform: translateX(50%);
        padding: 10px 14px;
        background: rgba(0, 0, 0, 0.82);
        color: white;
        border-radius: 10px;
        opacity: 0;
        transition: opacity 0.25s ease, transform 0.25s ease;
        z-index: 100000;
      }

      .xqc-toast.visible {
        opacity: 1;
        transform: translateX(50%) translateY(4px);
      }
    `);

    buildUI();
})();
