const SECRET_KEY = getEnvVar('SECRET_KEY');
// UI Elements
const textInput = document.getElementById('textInput');
const textOutput = document.getElementById('textOutput');
const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const copyBtn = document.getElementById('copyBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchHistory');
const themeSwitch = document.getElementById('themeSwitch');
// NEW: Password elements
const encryptionKey = document.getElementById('encryptionKey');
const passwordToggle = document.getElementById('passwordToggle');
const passwordStrength = document.getElementById('passwordStrength');
const strengthLabel = document.getElementById('strengthLabel');
const strengthBars = document.querySelectorAll('.strength-bar');
// NEW: Custom key option elements
const useCustomKeyCheckbox = document.getElementById('useCustomKey');
const passwordSection = document.getElementById('passwordSection');
const builtinKeyInfo = document.getElementById('builtinKeyInfo');
// NEW: Error message element
const textError = document.getElementById('textError');

// Mode Toggle Elements
const textModeBtn = document.getElementById('textModeBtn');
const fileModeBtn = document.getElementById('fileModeBtn');
const textModeSection = document.getElementById('textModeSection');
const fileModeSection = document.getElementById('fileModeSection');
const textOutputSection = document.getElementById('textOutputSection');
const fileOutputSection = document.getElementById('fileOutputSection');

// File Elements
const fileDropZone = document.getElementById('fileDropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileOutputList = document.getElementById('fileOutputList');
const downloadAllBtn = document.getElementById('downloadAllBtn');

// Progress Elements
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');
const progressPercent = document.getElementById('progressPercent');
const cancelBtn = document.getElementById('cancelBtn');
const encryptBtnText = document.getElementById('encryptBtnText');
const decryptBtnText = document.getElementById('decryptBtnText');

// File Processing
let selectedFiles = [];
let processedFiles = [];
let currentMode = 'text';
let isProcessing = false;
let processingController = null;

// Constants
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const SUPPORTED_TYPES = [
    'image/*',
    'text/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'application/json',
    'application/xml',
    'application/javascript'
];


let history = [];

// =======================
// Error Handling Utility (NEW)
// =======================
function showTextError(message) {
    textError.textContent = `⚠️ ${message}`;
    textError.classList.remove('hidden');
    // Hide the error after 5 seconds
    setTimeout(() => {
        textError.classList.add('hidden');
    }, 5000);
}

function clearTextError() {
    textError.textContent = '';
    textError.classList.add('hidden');
}

// =======================
// Password Management Functions
// =======================
function togglePasswordVisibility() {
    const isPassword = encryptionKey.type === 'password';
    
    if (isPassword) {
        encryptionKey.type = 'text';
        passwordToggle.textContent = '🙈';
        passwordToggle.title = 'Hide password';
    } else {
        encryptionKey.type = 'password';
        passwordToggle.textContent = '👁️';
        passwordToggle.title = 'Show password';
    }
}

function evaluatePasswordStrength(password) {
    let score = 0;
    let feedback = 'Not evaluated';
    let strength = 0;
    
    if (!password) {
        strengthBars.forEach(bar => bar.className = 'strength-bar');
        strengthLabel.textContent = 'Not evaluated';
        return;
    }
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    // Determine strength level
    if (score < 3) {
        feedback = 'Weak';
        strength = 1;
    } else if (score < 5) {
        feedback = 'Medium';
        strength = 2;
    } else {
        feedback = 'Strong';
        strength = 3;
    }
    
    // Update UI
    strengthBars.forEach((bar, index) => {
        if (index < strength) {
            bar.className = 'strength-bar active';
            if (strength === 1) bar.classList.add('weak');
            else if (strength === 2) bar.classList.add('medium');
            else bar.classList.add('strong');
        } else {
            bar.className = 'strength-bar';
        }
    });
    
    strengthLabel.textContent = feedback;
}

function validateEncryptionKey() {
    const key = encryptionKey.value.trim();
    
    if (!key) {
        showTextError('Please enter an encryption key/password.');
        return false;
    }
    
    if (key.length < 6) {
        showTextError('Encryption key must be at least 6 characters long.');
        return false;
    }
    
    return true;
}

// NEW: Custom key option management
function toggleCustomKeyOption() {
    const isUsingCustomKey = useCustomKeyCheckbox.checked;
    
    if (isUsingCustomKey) {
        // Show custom key input section
        passwordSection.classList.remove('hidden');
        builtinKeyInfo.classList.add('hidden');
    } else {
        // Hide custom key input section, show built-in key info
        passwordSection.classList.add('hidden');
        builtinKeyInfo.classList.remove('hidden');
        // Clear any custom key when switching to built-in
        encryptionKey.value = '';
        evaluatePasswordStrength('');
        clearTextError();
    }
}

// Initialize custom key option on page load
function initializeCustomKeyOption() {
    // Ensure initial state matches checkbox (should be unchecked by default)
    toggleCustomKeyOption();
}

function getEncryptionKey() {
    if (useCustomKeyCheckbox.checked) {
        return encryptionKey.value.trim();
    } else {
        return SECRET_KEY;
    }
}

function validateCurrentKey() {
    if (useCustomKeyCheckbox.checked) {
        return validateEncryptionKey();
    } else {
        return true; // Built-in key is always valid
    }
}


// File processing utilities
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('text/')) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📁';
}

function isSupportedFileType(file) {
    // Check if file type is in supported types or if it's a generic match
    return SUPPORTED_TYPES.some(type => {
        if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
    }) || file.name.toLowerCase().endsWith('.ice'); // Allow encrypted files
}

function validateFile(file) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
    }
    if (!isSupportedFileType(file)) {
        throw new Error(`File type "${file.type || 'unknown'}" is not supported.`);
    }
    return true;
}

function loadHistory() {
    const savedHistory = localStorage.getItem('iceEncryptHistory');
    if (savedHistory) {
        try {
            history = JSON.parse(savedHistory);
            renderHistory();
        } catch (e) {
            console.error('Error loading history:', e);
            history = [];
        }
    }
}


function saveHistory() {
    try {
        localStorage.setItem('iceEncryptHistory', JSON.stringify(history));
    } catch (e) {
        console.error('Error saving history:', e);
    }
}

/**
 * Add a new item to history
 * @param {string} type - 'encrypt' or 'decrypt'
 * @param {string} input - Original input text
 * @param {string} output - Result text
 */
function addToHistory(type, input, output) {
    const timestamp = new Date().toLocaleString();
    const historyItem = {
        type,
        input,
        output,
        timestamp
    };
    
    // Add to beginning of array (newest first)
    history.unshift(historyItem);
    
    // Limit history to 50 items to prevent localStorage overflow
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    saveHistory();
    // Re-render history with current search value
    renderHistory(searchInput.value);
}

// =======================
// Render History (BUG FIX: Use filtered index for deletion)
// =======================
function renderHistory(filterText = '') {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No history yet. Start encrypting or decrypting!</p>';
        return;
    }

    historyList.innerHTML = '';

    const filtered = history.filter(item =>
        item.input.toLowerCase().includes(filterText.toLowerCase()) ||
        item.output.toLowerCase().includes(filterText.toLowerCase()) ||
        item.type.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No matches found.</p>';
        return;
    }

    // Map filtered item to its original index in the main history array
    const historyWithOriginalIndex = filtered.map(item => ({
        ...item,
        originalIndex: history.findIndex(h => h === item)
    }));


    historyWithOriginalIndex.forEach((item) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const icon = item.type === 'encrypt' ? '🔐' : '🔓';
        const typeLabel = item.type === 'encrypt' ? 'Encrypted' : 'Decrypted';

        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-type">${icon} ${typeLabel}</span>
                <div class="history-item-actions">
                    <span class="history-item-time">${item.timestamp}</span>
                    <button class="btn-delete" title="Delete this entry" data-index="${item.originalIndex}">🗑️</button>
                </div>
            </div>
            <div class="history-item-content">
                <div class="history-item-label">Input:</div>
                <div class="history-item-text">${escapeHtml(truncateText(item.input, 100))}</div>
                <div class="history-item-label">Output:</div>
                <div class="history-item-text">${escapeHtml(truncateText(item.output, 100))}</div>
                <button class="btn-copy-small" title="Copy Output" data-output="${escapeHtml(item.output)}">📋 Copy Output</button>
            </div>
        `;

        historyList.appendChild(historyItem);
    });

    // Attach delete and copy events
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', e => {
            // Use the original index
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            deleteHistoryItem(index);
        });
    });

    document.querySelectorAll('.btn-copy-small').forEach(btn => {
        btn.addEventListener('click', e => {
            const text = e.target.getAttribute('data-output');
            navigator.clipboard.writeText(text).then(() => {
                e.target.textContent = '✓ Copied!';
                setTimeout(() => (e.target.textContent = '📋 Copy Output'), 1500);
            });
        });
    });
}

function deleteHistoryItem(index) {
    // Note: index passed here is the original index in the main history array
    if (index < 0 || index >= history.length) return;
    if (confirm('Delete this history entry?')) {
        history.splice(index, 1);
        saveHistory();
        // Re-render with current search input value
        renderHistory(searchInput.value);
    }
}

// =======================
// Search History
// =======================
searchInput?.addEventListener('input', e => {
    renderHistory(e.target.value);
});

// =======================
// Theme Toggle
// =======================
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('darkMode', isDark);
}

themeSwitch?.addEventListener('change', e => {
    applyTheme(e.target.checked);
});

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();

    // Load theme
    const savedTheme = localStorage.getItem('darkMode') === 'true';
    themeSwitch.checked = savedTheme;
    applyTheme(savedTheme);
});




function clearHistory() {
    if (history.length === 0) {
        return;
    }
    
    if (confirm('Are you sure you want to clear all history?')) {
        history = [];
        saveHistory();
        renderHistory();
    }
}


/**
 * Encrypt text using AES encryption
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
function encryptText(text) {
    if (!text.trim()) {
        throw new Error('Please enter text to encrypt');
    }

    const key = getEncryptionKey();
    if (!key) {
        throw new Error('Encryption key is required');
    }

    // Use CryptoJS AES encryption
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return encrypted;
}

/**
 * Decrypt text using AES decryption
 * @param {string} encryptedText - Text to decrypt
 * @returns {string} - Decrypted text
 */
function decryptText(encryptedText) {
    if (!encryptedText.trim()) {
        throw new Error('Please enter text to decrypt');
    }

    const key = getEncryptionKey();
    if (!key) {
        throw new Error('Encryption key is required');
    }

    try {
        // Use CryptoJS AES decryption
        const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
        const originalText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!originalText) {
            // Check for potential valid JSON structure for files that were text
            if (encryptedText.includes('---ICE_ENCRYPT_SEPARATOR---')) {
                throw new Error('File-formatted text detected. Please use File Mode for decryption.');
            }
            throw new Error('Invalid encrypted text or wrong key');
        }

        return originalText;
    } catch (e) {
        // Re-throw if it's the custom error, otherwise provide specific error for wrong key
        if (e.message.includes('File-formatted text detected')) {
             throw e;
        }
        if (e.message.includes('Malformed UTF-8 data') || e.message.includes('Unexpected token')) {
            throw new Error('Decryption failed. Wrong encryption key or corrupted data.');
        }
        throw new Error('Decryption failed. Please check the encrypted text and encryption key.');
    }
}

// File encryption/decryption functions
async function encryptFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

    const key = getEncryptionKey();
    
    // Encrypt the file data
    const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();

    // Create metadata
    const metadata = {
        originalName: file.name,
        originalSize: file.size,
        originalType: file.type,
        encryptedAt: new Date().toISOString(),
        version: '1.0'
    };

    // Combine metadata and encrypted data
    const metadataStr = JSON.stringify(metadata);
    const encryptedWithMetadata = metadataStr + '\n---ICE_ENCRYPT_SEPARATOR---\n' + encrypted;

    return new Blob([encryptedWithMetadata], { type: 'application/octet-stream' });
}

async function decryptFile(file) {
    const text = await file.text();
    const parts = text.split('\n---ICE_ENCRYPT_SEPARATOR---\n');

    if (parts.length !== 2) {
        throw new Error('Invalid encrypted file format');
    }

    const metadata = JSON.parse(parts[0]);
    const encryptedData = parts[1];

    const key = getEncryptionKey();
    
    try {
        // Decrypt the file data
        const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
        
        // CRITICAL FIX: Check if decryption was successful
        if (!decrypted || !decrypted.words || decrypted.words.length === 0) {
            throw new Error('Decryption failed. Wrong encryption key or corrupted file.');
        }
        
        const arrayBuffer = wordArrayToArrayBuffer(decrypted);
        
        // Additional validation: check if we got a valid ArrayBuffer
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('Decryption failed. Wrong encryption key or corrupted file.');
        }

        // Return the original file with metadata
        return {
            data: arrayBuffer,
            metadata: metadata
        };
    } catch (e) {
        // Re-throw our custom errors, otherwise provide generic error
        if (e.message.includes('Decryption failed')) {
            throw e;
        }
        throw new Error('Decryption failed. Wrong encryption key or corrupted file.');
    }
}

function wordArrayToArrayBuffer(wordArray) {
    const arrayOfWords = wordArray.hasOwnProperty('words') ? wordArray.words : [];
    const length = wordArray.hasOwnProperty('sigBytes') ? wordArray.sigBytes : arrayOfWords.length * 4;
    const uInt8Array = new Uint8Array(length);
    let index = 0;
    let word;
    let i;

    for (i = 0; i < length; i++) {
        word = arrayOfWords[i];
        uInt8Array[index++] = word >> 24;
        uInt8Array[index++] = (word >> 16) & 0xff;
        uInt8Array[index++] = (word >> 8) & 0xff;
        uInt8Array[index++] = word & 0xff;
    }

    return uInt8Array.buffer.slice(0, length);
}

// Chunked processing for large files
async function encryptFileChunked(file, onProgress) {
    const fileSize = file.size;
    const chunks = Math.ceil(fileSize / CHUNK_SIZE);
    const encryptedChunks = [];

    const key = getEncryptionKey();
    
    for (let i = 0; i < chunks; i++) {
        if (processingController && processingController.signal.aborted) {
            throw new Error('Operation cancelled');
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunk = file.slice(start, end);

        const arrayBuffer = await chunk.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();

        encryptedChunks.push(encrypted);

        if (onProgress) {
            onProgress((i + 1) / chunks);
        }

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Create metadata
    const metadata = {
        originalName: file.name,
        originalSize: file.size,
        originalType: file.type,
        encryptedAt: new Date().toISOString(),
        version: '1.0',
        chunked: true,
        totalChunks: chunks
    };

    // Combine metadata and encrypted chunks
    const metadataStr = JSON.stringify(metadata);
    const encryptedWithMetadata = metadataStr + '\n---ICE_ENCRYPT_SEPARATOR---\n' + encryptedChunks.join('\n---CHUNK_SEPARATOR---\n');

    return new Blob([encryptedWithMetadata], { type: 'application/octet-stream' });
}

async function decryptFileChunked(file, onProgress) {
    const text = await file.text();
    const parts = text.split('\n---ICE_ENCRYPT_SEPARATOR---\n');

    if (parts.length !== 2) {
        throw new Error('Invalid encrypted file format');
    }

    const metadata = JSON.parse(parts[0]);
    const encryptedChunks = parts[1].split('\n---CHUNK_SEPARATOR---\n');

    if (!metadata.chunked || encryptedChunks.length !== metadata.totalChunks) {
        throw new Error('Invalid chunked file format');
    }

    const key = getEncryptionKey();
    const decryptedChunks = [];

    for (let i = 0; i < encryptedChunks.length; i++) {
        if (processingController && processingController.signal.aborted) {
            throw new Error('Operation cancelled');
        }

        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedChunks[i], key);
            
            // CRITICAL FIX: Check if decryption was successful
            if (!decrypted || !decrypted.words || decrypted.words.length === 0) {
                throw new Error('Decryption failed. Wrong encryption key or corrupted file.');
            }
            
            const arrayBuffer = wordArrayToArrayBuffer(decrypted);
            
            // Additional validation: check if we got a valid ArrayBuffer
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error('Decryption failed. Wrong encryption key or corrupted file.');
            }
            
            decryptedChunks.push(arrayBuffer);
        } catch (e) {
            // Re-throw our custom errors, otherwise provide generic error
            if (e.message.includes('Decryption failed')) {
                throw e;
            }
            throw new Error('Decryption failed. Wrong encryption key or corrupted file.');
        }

        if (onProgress) {
            onProgress((i + 1) / encryptedChunks.length);
        }

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Combine all chunks into a single ArrayBuffer
    const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of decryptedChunks) {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }

    return {
        data: combinedBuffer.buffer,
        metadata: metadata
    };
}


// Progress tracking
function updateProgress(status, percent) {
    progressStatus.textContent = status;
    progressPercent.textContent = Math.round(percent * 100) + '%';
    progressFill.style.width = (percent * 100) + '%';
}

function showProgress() {
    progressSection.classList.remove('hidden');
}

function hideProgress() {
    progressSection.classList.add('hidden');
    updateProgress('Processing...', 0);
}

// File processing handlers
async function processFiles(operation) {
    if (isProcessing) return;

    if (selectedFiles.length === 0) {
        alert('Please select files first.');
        return;
    }

    // Validate encryption key for both encrypt and decrypt operations
    if (!validateCurrentKey()) {
        return;
    }

    isProcessing = true;
    processedFiles = [];
    processingController = new AbortController();

    try {
        showProgress();
        updateProgress('Starting...', 0);

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const fileName = file.name;

            updateProgress(`${operation === 'encrypt' ? 'Encrypting' : 'Decrypting'} ${fileName}...`, i / selectedFiles.length);

            let result;
            if (operation === 'encrypt') {
                if (file.size > 50 * 1024 * 1024) { // 50MB threshold for chunked processing
                    result = await encryptFileChunked(file, (progress) => {
                        const overallProgress = (i + progress) / selectedFiles.length;
                        updateProgress(`${operation === 'encrypt' ? 'Encrypting' : 'Decrypting'} ${fileName}...`, overallProgress);
                    });
                } else {
                    result = await encryptFile(file);
                    updateProgress(`${operation === 'encrypt' ? 'Encrypting' : 'Decrypting'} ${fileName}...`, (i + 1) / selectedFiles.length);
                }

                processedFiles.push({
                    originalFile: file,
                    processedBlob: result,
                    newName: file.name + '.ice',
                    operation: 'encrypt'
                });
            } else {
                let decryptedResult;
                if (file.name.endsWith('.ice')) {
                    try {
                        if (file.size > 50 * 1024 * 1024) {
                            decryptedResult = await decryptFileChunked(file, (progress) => {
                                const overallProgress = (i + progress) / selectedFiles.length;
                                updateProgress(`${operation === 'encrypt' ? 'Encrypting' : 'Decrypting'} ${fileName}...`, overallProgress);
                            });
                        } else {
                            decryptedResult = await decryptFile(file);
                        }

                        processedFiles.push({
                            originalFile: file,
                            processedBlob: new Blob([decryptedResult.data], { type: decryptedResult.metadata.originalType }),
                            newName: decryptedResult.metadata.originalName,
                            operation: 'decrypt',
                            metadata: decryptedResult.metadata
                        });
                    } catch (e) {
                        // CRITICAL: Stop all processing if any file fails to decrypt
                        // This prevents silent failures when wrong key is used
                        console.error(`Failed to decrypt ${fileName}:`, e);
                        hideProgress();
                        isProcessing = false;
                        processingController = null;
                        
                        // Show error both in alert and in text area
                        const errorMsg = `File decryption failed: ${e.message}`;
                        showTextError(errorMsg);
                        alert(`❌ Decryption Error\n\nFile: ${fileName}\nError: ${e.message}\n\nThis usually means the wrong encryption key was used. Please check your custom key and try again.`);
                        return; // Stop all further processing
                    }
                } else {
                    alert(`File "${fileName}" doesn't appear to be encrypted.`);
                    continue;
                }
            }

            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        updateProgress('Complete!', 1);
        renderProcessedFiles();

        // Add to history
        processedFiles.forEach(item => {
            const historyType = item.operation === 'encrypt' ? 'encrypt' : 'decrypt';
            const inputDesc = `${item.operation === 'encrypt' ? 'File' : 'Encrypted file'}: ${item.originalFile.name}`;
            const outputDesc = `${item.operation === 'encrypt' ? 'Encrypted' : 'Decrypted'} file: ${item.newName}`;
            addToHistory(historyType, inputDesc, outputDesc);
        });

        setTimeout(() => hideProgress(), 2000);

    } catch (e) {
        alert('Processing failed: ' + e.message);
        hideProgress();
    } finally {
        isProcessing = false;
        processingController = null;
    }
}

function renderProcessedFiles() {
    if (processedFiles.length === 0) {
        fileOutputList.innerHTML = '<p class="no-files">No files processed yet.</p>';
        return;
    }

    fileOutputList.innerHTML = processedFiles.map((item, index) => `
        <div class="processed-file-item">
            <div class="processed-file-info">
                <span class="processed-file-icon">${item.operation === 'encrypt' ? '🔐' : '🔓'}</span>
                <div class="processed-file-details">
                    <div class="processed-file-name">${escapeHtml(item.newName)}</div>
                    <div class="processed-file-meta">
                        ${item.operation === 'encrypt' ? 'Encrypted' : 'Decrypted'} • ${formatFileSize(item.processedBlob.size)}
                    </div>
                </div>
            </div>
            <div class="processed-file-actions">
                <button class="btn-download-single" onclick="downloadFile(${index})" title="Download this file">📥</button>
                <button class="btn-preview" onclick="previewFile(${index})" title="Preview file">👁️</button>
            </div>
        </div>
    `).join('');
}

function downloadFile(index) {
    const item = processedFiles[index];
    const url = URL.createObjectURL(item.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.newName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadAllFiles() {
    processedFiles.forEach((item, index) => {
        setTimeout(() => downloadFile(index), index * 100); // Stagger downloads
    });
}

// NEW: Enhanced previewFile function to handle text/JSON/ICE files
function previewFile(index) {
    const item = processedFiles[index];
    const mimeType = item.processedBlob.type;
    const url = URL.createObjectURL(item.processedBlob);

    if (mimeType.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
            // Open in new tab for full view
            window.open(url, '_blank');
        };
        img.src = url;
        // Don't forget to revoke URL later if not opening in a new tab
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || item.newName.endsWith('.ice')) {
        // Handle text-like content: read as text
        item.processedBlob.text().then(text => {
            const previewWindow = window.open('', '_blank');
            previewWindow.document.write(`
                <html>
                <head>
                    <title>Preview: ${item.newName}</title>
                    <style>
                        body { font-family: monospace; white-space: pre-wrap; padding: 20px; background: #2b2b2b; color: #b0eaff; }
                        h2 { color: #6ec1e3; }
                        pre { overflow: auto; max-height: 90vh; }
                    </style>
                </head>
                <body>
                    <h2>Preview: ${item.newName}</h2>
                    <hr>
                    <pre>${escapeHtml(text)}</pre>
                </body>
                </html>
            `);
            previewWindow.document.close();
            URL.revokeObjectURL(url); // Revoke immediately as content is copied to new window
        }).catch(e => {
            alert('Failed to read file content for preview.');
            URL.revokeObjectURL(url);
        });
    } else {
        alert('Preview not available for this file type.');
        URL.revokeObjectURL(url);
    }
}


function cancelProcessing() {
    if (processingController) {
        processingController.abort();
    }
}

// MODIFIED: Encrypt handler - uses custom error and clears input
function handleEncrypt() {
    clearTextError();
    
    // Validate encryption key first
    if (!validateCurrentKey()) {
        return;
    }
    
    if (currentMode === 'text') {
        try {
            const inputText = textInput.value;
            const encrypted = encryptText(inputText);

            // Display result with animation
            textOutput.value = encrypted;
            textOutput.style.transition = 'opacity 0.5s ease';
            textOutput.style.opacity = '0';
            setTimeout(() => {
                textOutput.style.opacity = '1';
            }, 50);

            // Add to history and clear input (UX Improvement)
            addToHistory('encrypt', inputText, encrypted);
            textInput.value = ''; // UX Improvement: Clear input after success

        } catch (e) {
            showTextError(e.message); // Use custom error display
        }
    } else {
        processFiles('encrypt');
    }
}

// MODIFIED: Decrypt handler - uses custom error and clears input
function handleDecrypt() {
    clearTextError();
    
    // Validate encryption key first
    if (!validateCurrentKey()) {
        return;
    }
    
    if (currentMode === 'text') {
        try {
            const inputText = textInput.value;
            const decrypted = decryptText(inputText);

            // Display result with animation
            textOutput.value = decrypted;
            textOutput.style.transition = 'opacity 0.5s ease';
            textOutput.style.opacity = '0';
            setTimeout(() => {
                textOutput.style.opacity = '1';
            }, 50);

            // Add to history and clear input (UX Improvement)
            addToHistory('decrypt', inputText, decrypted);
            textInput.value = ''; // UX Improvement: Clear input after success

        } catch (e) {
            showTextError(e.message); // Use custom error display
        }
    } else {
        processFiles('decrypt');
    }
}

/**
 * Handle copy button click (MODIFIED: Enhanced visual feedback)
 */
function handleCopy() {
    const outputText = textOutput.value;
    
    if (!outputText) {
        // Use custom error display for consistency
        showTextError('Nothing to copy in the result field!');
        return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(outputText)
        .then(() => {
            // Visual feedback - enhanced
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            copyBtn.style.background = 'linear-gradient(135deg, #a8e6cf 0%, #7fc8a8 100%)';
            copyBtn.style.border = '2px solid #a8e6cf';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = 'rgba(255, 255, 255, 0.2)'; // Revert to glassmorphism style
                copyBtn.style.border = '2px solid rgba(255, 255, 255, 0.5)';
                clearTextError(); // Clear error after successful copy
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showTextError('Failed to copy to clipboard.');
        });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

// Mode switching functionality (MODIFIED: Clear error and custom key option)
function switchMode(mode) {
    currentMode = mode;

    // Update button states
    textModeBtn.classList.toggle('active', mode === 'text');
    fileModeBtn.classList.toggle('active', mode === 'file');

    // Show/hide sections
    textModeSection.classList.toggle('active', mode === 'text');
    fileModeSection.classList.toggle('active', mode === 'file');
    textOutputSection.classList.toggle('hidden', mode === 'file');
    fileOutputSection.classList.toggle('hidden', mode === 'text');

    // Clear outputs when switching
    textInput.value = ''; // Clear text input
    textOutput.value = '';
    fileOutputList.innerHTML = '';
    processedFiles = [];
    
    clearTextError(); // NEW: Clear any existing error

    // Update button text
    encryptBtnText.textContent = mode === 'text' ? 'Encrypt' : 'Encrypt Files';
    decryptBtnText.textContent = mode === 'text' ? 'Decrypt' : 'Decrypt Files';
}

// File drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileInputChange(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function addFiles(files) {
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
        try {
            validateFile(file);
            validFiles.push(file);
        } catch (error) {
            errors.push(error.message);
        }
    });

    if (errors.length > 0) {
        alert('Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
        selectedFiles.push(...validFiles);
        renderFileList();
    }
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

function renderFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-item-info">
                <span class="file-item-icon">${getFileIcon(file.type)}</span>
                <div class="file-item-details">
                    <div class="file-item-name">${escapeHtml(file.name)}</div>
                    <div class="file-item-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <button class="file-item-remove" onclick="removeFile(${index})" title="Remove file">✕</button>
        </div>
    `).join('');
}


// Event listeners
encryptBtn.addEventListener('click', handleEncrypt);
decryptBtn.addEventListener('click', handleDecrypt);
copyBtn.addEventListener('click', handleCopy);
clearHistoryBtn.addEventListener('click', clearHistory);
cancelBtn.addEventListener('click', cancelProcessing);
downloadAllBtn.addEventListener('click', downloadAllFiles);

// Password and custom key event listeners
useCustomKeyCheckbox.addEventListener('change', toggleCustomKeyOption);
passwordToggle.addEventListener('click', togglePasswordVisibility);
encryptionKey.addEventListener('input', (e) => {
    evaluatePasswordStrength(e.target.value);
});

// Mode toggle listeners
textModeBtn.addEventListener('click', () => switchMode('text'));
fileModeBtn.addEventListener('click', () => switchMode('file'));

// File drag and drop listeners
fileDropZone.addEventListener('dragover', handleDragOver);
fileDropZone.addEventListener('dragleave', handleDragLeave);
fileDropZone.addEventListener('drop', handleDrop);
fileDropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileInputChange);

// Browse link listener
document.querySelector('.file-browse-link').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

// Allow Ctrl+Enter key to trigger encryption in input field
textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        handleEncrypt();
    }
});

// Load history when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    // Initialize custom key option
    initializeCustomKeyOption();
    // Initialize with text mode
    switchMode('text');
});