// Constants
const API_BASE = window.location.origin;
const BIRTHDAYS_URL = `${API_BASE}/birthdays`;

// Global variables
let csvData = [];
let selectedRows = new Set();
let existingBirthdays = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    checkAuth();
});

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'app.html';
        return;
    }
}

function setupFileUpload() {
    const fileInput = document.getElementById('csvFile');
    const uploadSection = document.getElementById('uploadSection');
    
    // Handle file selection
    fileInput.addEventListener('change', handleFileSelect);
    
    // Handle drag and drop
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('dragover');
    });
    
    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('dragover');
    });
    
    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') {
            fileInput.files = files;
            handleFileSelect();
        }
    });
}

function handleFileSelect() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseCSV(e.target.result);
        } catch (error) {
            showError('Error parsing CSV file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    // Validate headers
    const expectedHeaders = ['Name', 'Year', 'Month', 'Day', 'Link to Profile'];
    if (!expectedHeaders.every(header => headers.includes(header))) {
        throw new Error('CSV headers do not match expected format. Expected: ' + expectedHeaders.join(', '));
    }
    
    csvData = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 4) {
                const entry = {
                    name: values[0]?.trim() || '',
                    year: values[1]?.trim() ? parseInt(values[1]) : null,
                    month: values[2]?.trim() ? parseInt(values[2]) : null,
                    day: values[3]?.trim() ? parseInt(values[3]) : null,
                    profileLink: values[4]?.trim() || '',
                    originalIndex: i - 1
                };
                
                // Validate required fields
                if (entry.name && entry.month && entry.day) {
                    if (entry.month >= 1 && entry.month <= 12 && entry.day >= 1 && entry.day <= 31) {
                        csvData.push(entry);
                    }
                }
            }
        }
    }
    
    if (csvData.length === 0) {
        showError('No valid birthday entries found in CSV file');
        return;
    }
    
    // Load existing birthdays and check for duplicates
    loadExistingBirthdays();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result.map(item => item.replace(/^"|"$/g, '').trim());
}

function showPreview() {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('uploadSection').style.display = 'none';
    
    const container = document.getElementById('previewTableContainer');
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let tableHTML = `
        <table class="preview-table">
            <thead>
                <tr class="select-all-row">
                    <th class="checkbox-cell">
                        <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                    </th>
                    <th>Name</th>
                    <th>Birthday</th>
                    <th>Year</th>
                    <th>Profile Link</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    csvData.forEach((entry, index) => {
        const monthName = entry.month ? months[entry.month - 1] : '';
        const birthdayText = entry.month && entry.day ? `${monthName} ${entry.day}` : '';
        const yearText = entry.year ? entry.year : '';
        const profileLinkText = entry.profileLink ? 'Yes' : 'No';
        
        // Determine row class and status
        const rowClass = entry.isDuplicate ? 'duplicate-row' : '';
        let statusHTML = '';
        
        if (entry.isDuplicate) {
            const existing = entry.existingEntry;
            statusHTML = `
                <div class="duplicate-badge">Duplicate</div>
                <div class="duplicate-info">Already exists</div>
            `;
        } else {
            statusHTML = '<span style="color: #28a745;">New</span>';
        }
        
        tableHTML += `
            <tr class="${rowClass}">
                <td class="checkbox-cell">
                    <input type="checkbox" id="row-${index}" onchange="toggleRowSelection(${index})" ${entry.isDuplicate ? 'disabled' : ''}>
                </td>
                <td>${entry.name}</td>
                <td>${birthdayText}</td>
                <td>${yearText}</td>
                <td>${profileLinkText}</td>
                <td>${statusHTML}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
    
    updateImportButton();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const isChecked = selectAllCheckbox.checked;
    
    csvData.forEach((entry, index) => {
        const checkbox = document.getElementById(`row-${index}`);
        // Only check non-duplicate entries
        if (!entry.isDuplicate) {
            checkbox.checked = isChecked;
            
            if (isChecked) {
                selectedRows.add(index);
            } else {
                selectedRows.delete(index);
            }
        }
    });
    
    // When deselecting all, clear all selections regardless of duplicate status
    if (!isChecked) {
        selectedRows.clear();
    }
    
    updateImportButton();
    updateSelectAllCheckbox();
}

function toggleRowSelection(index) {
    const entry = csvData[index];
    
    // Don't allow selection of duplicate entries
    if (entry.isDuplicate) {
        return;
    }
    
    const checkbox = document.getElementById(`row-${index}`);
    
    if (checkbox.checked) {
        selectedRows.add(index);
    } else {
        selectedRows.delete(index);
    }
    
    updateImportButton();
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalSelectableRows = csvData.filter(entry => !entry.isDuplicate).length;
    const selectedCount = selectedRows.size;
    
    if (selectedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedCount === totalSelectableRows) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
}

function updateImportButton() {
    const importBtn = document.getElementById('importBtn');
    const selectedCount = selectedRows.size;
    
    importBtn.textContent = `Import Selected (${selectedCount})`;
    importBtn.disabled = selectedCount === 0;
}

async function importSelected() {
    if (selectedRows.size === 0) return;
    
    const importBtn = document.getElementById('importBtn');
    const progressDiv = document.getElementById('importProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultDiv = document.getElementById('importResult');
    
    importBtn.disabled = true;
    progressDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    
    const selectedEntries = Array.from(selectedRows).map(index => csvData[index]);
    
    // Filter out entries that would become duplicates after import
    const entriesToImport = [];
    const duplicateEntries = [];
    
    for (const entry of selectedEntries) {
        // Check if this entry would be a duplicate after import
        const wouldBeDuplicate = existingBirthdays.some(existing => 
            existing.name.toLowerCase() === entry.name.toLowerCase() &&
            existing.month === entry.month &&
            existing.day === entry.day
        );
        
        if (wouldBeDuplicate) {
            duplicateEntries.push(entry);
        } else {
            entriesToImport.push(entry);
        }
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < entriesToImport.length; i++) {
        const entry = entriesToImport[i];
        const progress = ((i + 1) / entriesToImport.length) * 100;
        
        progressFill.style.width = progress + '%';
        progressText.textContent = `Importing ${entry.name}... (${i + 1}/${entriesToImport.length})`;
        
        try {
            const response = await fetch(BIRTHDAYS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    name: entry.name,
                    day: entry.day,
                    month: entry.month,
                    year: entry.year
                })
            });
            
            if (response.ok) {
                successCount++;
            } else {
                errorCount++;
                const data = await response.json();
                errors.push(`${entry.name}: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            errorCount++;
            errors.push(`${entry.name}: ${error.message}`);
        }
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    progressDiv.style.display = 'none';
    importBtn.disabled = false;
    
    // Show results
    let resultHTML = '';
    if (successCount > 0) {
        resultHTML += `<div class="success">Successfully imported ${successCount} birthday${successCount !== 1 ? 's' : ''}!</div>`;
    }
    if (duplicateEntries.length > 0) {
        resultHTML += `<div class="info">Skipped ${duplicateEntries.length} duplicate${duplicateEntries.length !== 1 ? 's' : ''} that already exist in your birthday book.</div>`;
    }
    if (errorCount > 0) {
        resultHTML += `<div class="error">Failed to import ${errorCount} birthday${errorCount !== 1 ? 's' : ''}.</div>`;
        if (errors.length > 0) {
            resultHTML += '<ul style="color: #dc3545; margin-top: 10px;">';
            errors.forEach(error => {
                resultHTML += `<li>${error}</li>`;
            });
            resultHTML += '</ul>';
        }
    }
    
    resultDiv.innerHTML = resultHTML;
    
    // Refresh the table to show updated duplicate status
    loadExistingBirthdays();
    
    // Clear selections
    selectedRows.clear();
    updateImportButton();
    updateSelectAllCheckbox();
    
    // Reset checkboxes
    document.getElementById('selectAll').checked = false;
    csvData.forEach((entry, index) => {
        const checkbox = document.getElementById(`row-${index}`);
        checkbox.checked = false;
    });
}

async function loadExistingBirthdays() {
    try {
        const response = await fetch(BIRTHDAYS_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load existing birthdays');
        }
        
        existingBirthdays = await response.json();
        checkForDuplicates();
        showPreview();
        
    } catch (error) {
        console.error('Error loading existing birthdays:', error);
        showError('Failed to load existing birthdays. Please try again.');
    }
}

function checkForDuplicates() {
    csvData.forEach(entry => {
        // Check for duplicates based on name, month, and day
        const duplicate = existingBirthdays.find(existing => 
            existing.name.toLowerCase() === entry.name.toLowerCase() &&
            existing.month === entry.month &&
            existing.day === entry.day
        );
        
        entry.isDuplicate = !!duplicate;
        entry.existingEntry = duplicate || null;
    });
}

function showError(message) {
    const resultDiv = document.getElementById('importResult');
    resultDiv.innerHTML = `<div class="error">${message}</div>`;
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'app.html';
}
