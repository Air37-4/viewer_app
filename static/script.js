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

    // Controls
    const changeFolderBtn = document.getElementById('change-folder-btn');
    const currentPathEl = document.getElementById('current-path');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');

    let availableFiles = [];
    const addedFiles = new Set();

    // Zoom Handling
    if (zoomSlider) {
        zoomSlider.oninput = (e) => {
            const val = e.target.value;
            // Using transform for scale
            document.documentElement.style.setProperty('--zoom-factor', val);
            zoomValue.textContent = `${Math.round(val * 100)}%`;
        };
    }

    // Folder Change
    if (changeFolderBtn) {
        changeFolderBtn.onclick = async () => {
            if (window.pywebview && window.pywebview.api) {
                const newPath = await window.pywebview.api.select_folder();
                if (newPath) {
                    console.log('Selected folder:', newPath);
                    
                    // Clear grid and added files before loading new folder
                    grid.innerHTML = '';
                    addedFiles.clear();
                    
                    // Update path display
                    currentPathEl.textContent = newPath;
                    
                    // Give server a moment to update the folder
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Fetch files from new folder and auto-add them
                    console.log('Fetching file list...');
                    await fetchFileList(true);
                    console.log('Files fetched:', availableFiles.length);
                }
            } else {
                alert("Эта функция доступна только в приложении");
            }
        };
    }

    // No session saving - always start fresh

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
                    addToFileGrid(uploadedFile);
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

    async function fetchFileList(autoAddFiles = false) {
        try {
            const folderRes = await fetch('/api/folder');
            const folderData = await folderRes.json();
            console.log('Current folder from server:', folderData.path);
            if (currentPathEl) currentPathEl.textContent = folderData.path;

            const filesResponse = await fetch('/api/files');
            availableFiles = await filesResponse.json();
            console.log('Files received from server:', availableFiles.length, availableFiles);
            renderSidebar();

            // Auto-add all files if requested (when folder is selected or on first load with existing folder)
            if (autoAddFiles) {
                // When explicitly requested (folder selection), add all files
                console.log('Auto-adding files, count:', availableFiles.length);
                availableFiles.forEach(file => {
                    console.log('Processing file:', file.name, 'already added?', addedFiles.has(file.name));
                    if (!addedFiles.has(file.name)) {
                        console.log('Adding file to grid:', file.name);
                        addToFileGrid(file);
                    }
                });
                console.log('Total files added:', addedFiles.size, 'Grid items:', grid.children.length);
            } else if (addedFiles.size === 0 && availableFiles.length > 0) {
                // On first load with existing folder, also add all files
                availableFiles.forEach(file => {
                    if (!addedFiles.has(file.name)) {
                        addToFileGrid(file);
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
            const typeLabel = { 'html': 'HTML', 'video': 'MP4', 'audio': 'MP3', 'image': 'IMG' }[file.type] || 'FILE';
            el.innerHTML = `
                <span>${file.name}</span>
                <span class="type-icon">${typeLabel}</span>
            `;
            el.onclick = () => {
                if (addedFiles.has(file.name)) return;
                addToFileGrid(file);
                el.classList.add('added');
            };
            fileListEl.appendChild(el);
        });
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

    function addToFileGrid(file) {
        if (addedFiles.has(file.name)) return; // Prevent duplicates

        addedFiles.add(file.name);

        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.filename = file.name;

        const preview = document.createElement('div');
        preview.className = 'preview-container';

        // Type Badge
        const typeEmoji = { 'html': '🌐', 'video': '📹', 'audio': '🎵', 'image': '🖼️' }[file.type] || '📄';
        const badge = document.createElement('div');
        badge.className = 'type-badge';
        badge.textContent = typeEmoji;

        // Progress Bar (for video/audio)
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        if (file.type === 'html') {
            const iframe = document.createElement('iframe');
            iframe.src = `/files/${file.name}`;
            iframe.scrolling = 'no'; // Disable scrollbars
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
        } else if (file.type === 'image') {
            const img = document.createElement('img');
            img.src = `/files/${file.name}`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            preview.appendChild(img);
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

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.textContent = file.name;
        overlay.appendChild(nameSpan);

        const controlsGroup = document.createElement('div');
        controlsGroup.className = 'controls-group';

        // Play/Pause Button (for Media)
        if (file.type === 'video' || file.type === 'audio') {
            const playBtn = document.createElement('button');
            playBtn.className = 'control-btn play';
            playBtn.innerHTML = '⏸'; // Auto-plays by default
            playBtn.title = "Play/Pause";

            playBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const media = item.querySelector('video') || item.querySelector('audio');
                if (media.paused) {
                    media.play();
                    playBtn.innerHTML = '⏸';
                } else {
                    media.pause();
                    playBtn.innerHTML = '▶';
                }
            };
            controlsGroup.appendChild(playBtn);
        }

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'control-btn delete';
        deleteBtn.innerHTML = '🗑'; // Trash icon
        deleteBtn.title = "Remove";

        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Убрать "${file.name}" из списка?`)) {
                removeItem(item, file.name);
            }
        };
        controlsGroup.appendChild(deleteBtn);

        overlay.appendChild(controlsGroup);

        item.appendChild(preview);
        item.appendChild(badge);
        item.appendChild(progressBar);
        item.appendChild(overlay);

        // Double click to fullscreen
        item.ondblclick = () => openFullscreen(file);

        // Hover effect: speed up video + scale handled in CSS
        item.onmouseenter = () => {
            const media = item.querySelector('video') || item.querySelector('audio');
            // Only speed up if it's playing
            if (media && !media.paused) media.playbackRate = 1.5;
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
        updateUI();
    }

    function openFullscreen(file) {
        modalContent.innerHTML = '';
        let element;
        if (file.type === 'html') {
            element = document.createElement('iframe');
            element.src = `/files/${file.name}`;
        } else if (file.type === 'image') {
            element = document.createElement('img');
            element.src = `/files/${file.name}`;
            element.style.width = '100%';
            element.style.height = '100%';
            element.style.objectFit = 'contain';
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
