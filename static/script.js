document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('grid');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.querySelector('.close');

    const addBtn = document.getElementById('add-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const fileListEl = document.getElementById('file-list');
    const fileUpload = document.getElementById('file-upload');
    const playAllBtn = document.getElementById('play-all-btn');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');
    const changeFolderBtn = document.getElementById('change-folder-btn');
    const currentPathEl = document.getElementById('current-path');
    const bgMusicSelect = document.getElementById('bg-music-select');
    const toggleBgMusicBtn = document.getElementById('toggle-bg-music');

    let availableFiles = [];
    const addedFiles = new Set();
    let globalAudio = new Audio();
    globalAudio.loop = true;

    // Toggle Sidebar
    addBtn.onclick = () => sidebar.classList.toggle('open');
    closeSidebarBtn.onclick = () => sidebar.classList.remove('open');

    // File Upload
    fileUpload.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.status === 'success') {
                await fetchFileList();
                alert('Файл загружен успешно!');
            } else {
                alert(`Ошибка: ${result.message}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    // Zoom Handling
    zoomSlider.oninput = (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--zoom-factor', val);
        zoomValue.textContent = `${Math.round(val * 100)}%`;
    };

    // Folder Change
    changeFolderBtn.onclick = async () => {
        if (window.pywebview && window.pywebview.api) {
            const newPath = await window.pywebview.api.select_folder();
            if (newPath) {
                currentPathEl.textContent = newPath;
                await fetchFileList();
            }
        }
    };

    // Background Music controls
    toggleBgMusicBtn.onclick = () => {
        if (!bgMusicSelect.value) return;

        if (globalAudio.paused) {
            if (!globalAudio.src || globalAudio.src.indexOf(encodeURIComponent(bgMusicSelect.value)) === -1) {
                globalAudio.src = `/files/${bgMusicSelect.value}`;
            }
            globalAudio.play();
            toggleBgMusicBtn.textContent = '⏸ Пауза';
        } else {
            globalAudio.pause();
            toggleBgMusicBtn.textContent = '▶ Играть';
        }
    };

    bgMusicSelect.onchange = () => {
        globalAudio.pause();
        toggleBgMusicBtn.textContent = '▶ Играть';
    };

    async function fetchFileList() {
        try {
            const response = await fetch('/api/folder');
            const data = await response.json();
            currentPathEl.textContent = data.path;

            // Re-fetch actual files
            const filesResponse = await fetch('/api/files');
            availableFiles = await filesResponse.json();

            // Populate music dropdown
            const currentVal = bgMusicSelect.value;
            bgMusicSelect.innerHTML = '<option value="">Без музыки</option>';
            availableFiles.forEach(f => {
                if (f.type === 'audio') {
                    const opt = document.createElement('option');
                    opt.value = f.name;
                    opt.textContent = f.name;
                    if (f.name === currentVal) opt.selected = true;
                    bgMusicSelect.appendChild(opt);
                }
            });

            renderSidebar();
        } catch (error) {
            console.error('Error fetching file list:', error);
        }
    }

    function renderSidebar() {
        fileListEl.innerHTML = '';
        availableFiles.forEach(file => {
            const el = document.createElement('div');
            el.className = 'file-item';
            const typeLabel = { 'html': 'HTML', 'video': 'MP4', 'audio': 'MP3' }[file.type] || 'FILE';
            el.innerHTML = `
                <span>${file.name}</span>
                <span class="type-icon">${typeLabel}</span>
            `;
            el.onclick = () => {
                if (addedFiles.has(file.name)) return alert('Уже добавлено!');
                addToFileGrid(file);
                sidebar.classList.remove('open');
            };
            fileListEl.appendChild(el);
        });
    }

    function addToFileGrid(file) {
        addedFiles.add(file.name);

        const item = document.createElement('div');
        item.className = 'grid-item';
        item.id = `item-${file.name.replace(/\s+/g, '-')}`;

        const preview = document.createElement('div');
        preview.className = 'preview-container';

        if (file.type === 'html') {
            const iframe = document.createElement('iframe');
            iframe.src = `/files/${file.name}`;
            iframe.scrolling = 'no';
            preview.appendChild(iframe);
        } else if (file.type === 'video') {
            const video = document.createElement('video');
            video.src = `/files/${file.name}`;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            // Specific fix for the user's WhatsApp video
            if (file.name.includes("WhatsApp Video 2025-12-20 at 06.36.48")) {
                video.className = 'no-bottom-crop';
            }
            preview.appendChild(video);
        } else {
            const audio = document.createElement('audio');
            audio.src = `/files/${file.name}`;
            audio.loop = true;
            audio.autoplay = true;
            preview.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-size:2rem;">🎵</div>';
            preview.appendChild(audio);
        }

        const overlay = document.createElement('div');
        overlay.className = 'item-overlay';
        overlay.innerHTML = `
            <span class="file-name">${file.name}</span>
            <div class="item-controls">
                ${(file.type !== 'html') ? '<button class="btn-small unmute-btn">🔇</button>' : ''}
                <button class="btn-small pause-btn">⏸</button>
                <button class="btn-small btn-danger delete-btn">Убрать</button>
            </div>
        `;

        item.appendChild(preview);
        item.appendChild(overlay);

        item.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            openFullscreen(file);
        };

        const pauseBtn = overlay.querySelector('.pause-btn');
        pauseBtn.onclick = (e) => {
            e.stopPropagation();
            if (file.type === 'html') {
                const iframe = preview.querySelector('iframe');
                if (iframe.src !== 'about:blank') {
                    iframe.dataset.src = iframe.src;
                    iframe.src = 'about:blank';
                    pauseBtn.textContent = '▶';
                } else {
                    iframe.src = iframe.dataset.src;
                    pauseBtn.textContent = '⏸';
                }
            } else {
                const media = preview.querySelector('video') || preview.querySelector('audio');
                if (media.paused) {
                    media.play();
                    pauseBtn.textContent = '⏸';
                } else {
                    media.pause();
                    pauseBtn.textContent = '▶';
                }
            }
        };

        if (file.type !== 'html') {
            const unmuteBtn = overlay.querySelector('.unmute-btn');
            unmuteBtn.onclick = (e) => {
                e.stopPropagation();
                const media = preview.querySelector('video') || preview.querySelector('audio');
                media.muted = !media.muted;
                unmuteBtn.textContent = media.muted ? '🔇' : '🔊';
            };
        }

        overlay.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            item.remove();
            addedFiles.delete(file.name);
        };

        grid.appendChild(item);

        // Hover effect: center focus + 2x scale + 1.5x speed
        let leaveTimeout;
        item.onmouseenter = (e) => {
            clearTimeout(leaveTimeout);
            if (item.classList.contains('hovered')) return;

            grid.classList.add('has-hovered');
            item.classList.add('hovered');

            const media = item.querySelector('video') || item.querySelector('audio');
            if (media) {
                media.playbackRate = 1.5;
                // Double check to ensure speed sticks
                setTimeout(() => { if (item.classList.contains('hovered')) media.playbackRate = 1.5; }, 100);
            }
        };

        item.onmouseleave = (e) => {
            // Check if we really left the focus area
            leaveTimeout = setTimeout(() => {
                item.classList.remove('hovered');
                grid.classList.remove('has-hovered');

                const media = item.querySelector('video') || item.querySelector('audio');
                if (media) {
                    media.playbackRate = 1.0;
                }
            }, 50);
        };
    }

    function openFullscreen(file) {
        modalContent.innerHTML = '';
        let element;
        if (file.type === 'html') {
            element = document.createElement('iframe');
            element.src = `/files/${file.name}`;
        } else {
            element = document.createElement('video');
            element.src = `/files/${file.name}`;
            element.controls = true;
            element.autoplay = true;
        }
        modalContent.appendChild(element);
        modal.style.display = 'block';
    }

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        modalContent.innerHTML = '';
    };

    window.onclick = (e) => { if (e.target === modal) closeBtn.onclick(); };

    playAllBtn.onclick = () => {
        const mediaElements = document.querySelectorAll('video, audio');
        const iframes = document.querySelectorAll('iframe');

        // Play chosen background music
        if (bgMusicSelect.value) {
            globalAudio.src = `/files/${bgMusicSelect.value}`;
            globalAudio.play();
            toggleBgMusicBtn.textContent = '⏸ Пауза';
        }

        mediaElements.forEach(m => {
            m.currentTime = 0;
            m.playbackRate = 1.0;
            m.play().catch(e => console.error("Auto-play blocked:", e));
        });

        iframes.forEach(i => {
            const src = i.dataset.src || i.src;
            i.src = 'about:blank';
            setTimeout(() => { i.src = src; }, 10);
        });

        document.querySelectorAll('.pause-btn').forEach(b => b.textContent = '⏸');
    };

    fetchFileList();
});
