document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('grid');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.querySelector('.close');
    const welcomeScreen = document.getElementById('welcome-screen');
    const playAllBtn = document.getElementById('play-all-btn');
    const dropZone = document.getElementById('drop-zone');

    const addBtn = document.getElementById('add-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const fileListEl = document.getElementById('file-list');
    const fileUpload = document.getElementById('file-upload');

    let availableFiles = [];
    const addedFiles = new Set();

    // Load saved session
    const savedSession = localStorage.getItem('mediaPlayerSession');
    let sessionFiles = savedSession ? JSON.parse(savedSession) : [];

    // Toggle Sidebar
    addBtn.onclick = () => sidebar.classList.toggle('open');
    closeSidebarBtn.onclick = () => sidebar.classList.remove('open');

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        document.body.addEventListener(eventName, () => {
            dropZone.classList.add('active');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('active');
        });
    });

    document.body.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files;
        for (let file of files) {
            await uploadFile(file);
        }
    });

    // File Upload - Multiple files support
    fileUpload.onchange = async (e) => {
        const files = e.target.files;
        for (let file of files) {
            await uploadFile(file);
        }
        fileUpload.value = ''; // Reset input
    };

    async function uploadFile(file) {
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
                // Auto-add the uploaded file to grid
                const uploadedFile = availableFiles.find(f => f.name === file.name);
                if (uploadedFile && !addedFiles.has(uploadedFile.name)) {
                    addToFileGrid(uploadedFile, true);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Space - toggle playback
        if (e.code === 'Space' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            toggleAllPlayback();
        }

        // Escape - close modal or sidebar
        if (e.code === 'Escape') {
            if (modal.style.display === 'block') {
                closeBtn.onclick();
            } else if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    });

    function toggleAllPlayback() {
        const mediaElements = document.querySelectorAll('video, audio');
        const allPaused = Array.from(mediaElements).every(m => m.paused);

        mediaElements.forEach(m => {
            if (allPaused) {
                m.play().catch(() => { });
            } else {
                m.pause();
            }
        });
    }

    async function fetchFileList() {
        try {
            const filesResponse = await fetch('/api/files');
            availableFiles = await filesResponse.json();
            renderSidebar();

            // Restore session on first load
            if (sessionFiles.length > 0 && addedFiles.size === 0) {
                sessionFiles.forEach(fileName => {
                    const file = availableFiles.find(f => f.name === fileName);
                    if (file && !addedFiles.has(file.name)) {
                        addToFileGrid(file, false);
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching file list:', error);
        }
    }

    function renderSidebar() {
        fileListEl.innerHTML = '';
        availableFiles.forEach(file => {
            const el = document.createElement('div');
            el.className = 'file-item' + (addedFiles.has(file.name) ? ' added' : '');
            const typeLabel = { 'html': 'HTML', 'video': 'MP4', 'audio': 'MP3' }[file.type] || 'FILE';
            el.innerHTML = `
                <span>${file.name}</span>
                <span class="type-icon">${typeLabel}</span>
            `;
            el.onclick = () => {
                if (addedFiles.has(file.name)) return;
                addToFileGrid(file, true);
                el.classList.add('added');
            };
            fileListEl.appendChild(el);
        });
    }

    function saveSession() {
        localStorage.setItem('mediaPlayerSession', JSON.stringify([...addedFiles]));
    }

    function updateUI() {
        if (addedFiles.size > 0) {
            welcomeScreen.classList.add('hidden');
            playAllBtn.style.display = 'block';
        } else {
            welcomeScreen.classList.remove('hidden');
            playAllBtn.style.display = 'none';
        }
        renderSidebar(); // Update sidebar to show added state
    }

    function addToFileGrid(file, save = true) {
        if (addedFiles.has(file.name)) return; // Prevent duplicates

        addedFiles.add(file.name);
        if (save) saveSession();

        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.filename = file.name;

        const preview = document.createElement('div');
        preview.className = 'preview-container';

        // Type Badge
        const typeEmoji = { 'html': '🌐', 'video': '📹', 'audio': '🎵' }[file.type] || '📄';
        const badge = document.createElement('div');
        badge.className = 'type-badge';
        badge.textContent = typeEmoji;

        // Progress Bar (for video/audio)
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

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

            video.ontimeupdate = () => {
                if (video.duration) {
                    const percent = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${percent}%`;
                }
            };

            preview.appendChild(video);
        } else {
            const audio = document.createElement('audio');
            audio.src = `/files/${file.name}`;
            audio.loop = true;
            audio.autoplay = true;

            audio.ontimeupdate = () => {
                if (audio.duration) {
                    const percent = (audio.currentTime / audio.duration) * 100;
                    progressBar.style.width = `${percent}%`;
                }
            };

            preview.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-size:3rem;">🎵</div>';
            preview.appendChild(audio);
        }

        const overlay = document.createElement('div');
        overlay.className = 'item-overlay';
        overlay.innerHTML = `<span class="file-name">${file.name}</span>`;

        item.appendChild(preview);
        item.appendChild(badge);
        item.appendChild(progressBar);
        item.appendChild(overlay);

        // Double click to fullscreen
        item.ondblclick = () => openFullscreen(file);

        // Right click to remove
        item.oncontextmenu = (e) => {
            e.preventDefault();
            removeItem(item, file.name);
        };

        // Hover effect: speed up video
        item.onmouseenter = () => {
            const media = item.querySelector('video') || item.querySelector('audio');
            if (media) media.playbackRate = 1.5;
        };

        item.onmouseleave = () => {
            const media = item.querySelector('video') || item.querySelector('audio');
            if (media) media.playbackRate = 1.0;
        };

        grid.appendChild(item);
        updateUI();
    }

    function removeItem(item, fileName) {
        item.remove();
        addedFiles.delete(fileName);
        sessionFiles = sessionFiles.filter(f => f !== fileName);
        saveSession();
        updateUI();
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

    window.onclick = (e) => {
        if (e.target === modal) closeBtn.onclick();
    };

    playAllBtn.onclick = () => {
        const mediaElements = document.querySelectorAll('video, audio');
        const iframes = document.querySelectorAll('.grid-item iframe');

        mediaElements.forEach(m => {
            m.currentTime = 0;
            m.playbackRate = 1.0;
            m.play().catch(e => console.error("Auto-play blocked:", e));
        });

        iframes.forEach(i => {
            const src = i.src;
            i.src = 'about:blank';
            setTimeout(() => { i.src = src; }, 10);
        });
    };

    fetchFileList();
});
