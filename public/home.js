// API endpoints
const API_BASE = window.location.origin;
const BIRTHDAYS_URL = `${API_BASE}/birthdays`;

// Global variable to store all birthdays
let allBirthdays = [];

// Global variable to store sharing links
let sharingLinks = [];

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    // Initialize the form
    initializeForm();
    
    // Load existing birthdays
    loadBirthdays();
    
    // Load existing sharing links
    loadSharingLinks();
});

function initializeForm() {
    // Populate day dropdown (1-31)
    const daySelect = document.getElementById('day');
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }
    
    // Populate month dropdown
    const monthSelect = document.getElementById('month');
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    // Handle form submission
    document.getElementById('birthdayForm').addEventListener('submit', handleBirthdaySubmit);
}

async function handleBirthdaySubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const day = parseInt(document.getElementById('day').value);
    const month = parseInt(document.getElementById('month').value);
    const year = document.getElementById('year').value ? parseInt(document.getElementById('year').value) : null;
    
    if (!name || !day || !month) {
        showFormError('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(BIRTHDAYS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                name,
                day,
                month,
                year
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to add birthday');
        }
        
        showFormSuccess('Birthday added successfully!');
        document.getElementById('birthdayForm').reset();
        loadBirthdays(); // Refresh the list
        
    } catch (error) {
        showSharingError(error.message);
    }
}

async function loadBirthdays() {
    try {
        const response = await fetch(BIRTHDAYS_URL, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load birthdays');
        }
        
        const birthdays = await response.json();
        allBirthdays = birthdays; // Store all birthdays globally
        displayBirthdays(birthdays);
        
    } catch (error) {
        console.error('Error loading birthdays:', error);
        document.getElementById('birthdaysList').innerHTML = '<p>Error loading birthdays</p>';
    }
}

function switchTab(filterValue) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked tab
    document.querySelector(`[data-filter="${filterValue}"]`).classList.add('active');
    
    // Filter birthdays based on selected tab
    let filteredBirthdays = [...allBirthdays];
    
    switch (filterValue) {
        case 'week':
            filteredBirthdays = allBirthdays.filter(birthday => birthday.daysUntilNextBirthday <= 7);
            break;
        case 'month':
            filteredBirthdays = allBirthdays.filter(birthday => birthday.daysUntilNextBirthday <= 30);
            break;
        case 'threeMonths':
            filteredBirthdays = allBirthdays.filter(birthday => birthday.daysUntilNextBirthday <= 90);
            break;
        case 'sixMonths':
            filteredBirthdays = allBirthdays.filter(birthday => birthday.daysUntilNextBirthday <= 180);
            break;
        case 'all':
        default:
            filteredBirthdays = allBirthdays;
            break;
    }
    
    displayBirthdays(filteredBirthdays);
}

function displayBirthdays(birthdays) {
    const container = document.getElementById('birthdaysList');
    
    if (birthdays.length === 0) {
        const activeTab = document.querySelector('.tab-btn.active');
        const filterValue = activeTab ? activeTab.getAttribute('data-filter') : 'all';
        let message = 'No birthdays added yet.';
        
        if (filterValue !== 'all' && allBirthdays.length > 0) {
            switch (filterValue) {
                case 'week':
                    message = 'No birthdays in the next week.';
                    break;
                case 'month':
                    message = 'No birthdays in the next month.';
                    break;
                case 'threeMonths':
                    message = 'No birthdays in the next 3 months.';
                    break;
                case 'sixMonths':
                    message = 'No birthdays in the next 6 months.';
                    break;
            }
        }
        
        container.innerHTML = `<p>${message}</p>`;
        return;
    }
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const html = birthdays.map(birthday => {
        const monthName = months[birthday.month - 1];
        const yearText = birthday.year ? `, ${birthday.year}` : '';
        const daysText = birthday.daysUntilNextBirthday === 0 
            ? 'Today!' 
            : birthday.daysUntilNextBirthday === 1 
                ? 'Tomorrow!' 
                : `in ${birthday.daysUntilNextBirthday} days`;
        
        return `
            <div class="birthday-item">
                <div class="birthday-info">
                    <div class="birthday-name">${birthday.name}</div>
                    <div class="birthday-date">${monthName} ${birthday.day}${yearText}</div>
                    <div class="birthday-countdown">${daysText}</div>
                </div>
                <button class="delete-btn" onclick="deleteBirthday('${birthday.id}')">Delete</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

async function deleteBirthday(id) {
    if (!confirm('Are you sure you want to delete this birthday?')) {
        return;
    }

    try {
        const response = await fetch(`${BIRTHDAYS_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete birthday');
        }
        
        // Refresh the list after successful deletion
        loadBirthdays();
        
    } catch (error) {
        console.error('Error deleting birthday:', error);
        alert('Failed to delete birthday. Please try again.');
    }
}

function showFormError(message) {
    const errorDiv = document.getElementById('formError');
    const successDiv = document.getElementById('formSuccess');
    errorDiv.textContent = message;
    successDiv.textContent = '';
}

function showFormSuccess(message) {
    const errorDiv = document.getElementById('formError');
    const successDiv = document.getElementById('formSuccess');
    successDiv.textContent = message;
    errorDiv.textContent = '';
}

function showSharingError(message) {
    const errorDiv = document.getElementById('sharingError');
    const successDiv = document.getElementById('sharingSuccess');
    errorDiv.textContent = message;
    successDiv.textContent = '';
}

function showSharingSuccess(message) {
    const errorDiv = document.getElementById('sharingError');
    const successDiv = document.getElementById('sharingSuccess');
    successDiv.textContent = message;
    errorDiv.textContent = '';
}

// Sharing functionality
async function generateSharingLink() {
    const button = document.getElementById('generateLinkBtn');
    button.disabled = true;
    button.textContent = 'Generating...';
    
    try {
        const response = await fetch(`${API_BASE}/sharing/links`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to generate sharing link');
        }
        
        const linkData = await response.json();
        // Add the new link to the beginning of the array
        sharingLinks.unshift(linkData);
        displaySharingLinks();
        showSharingSuccess('Sharing link generated successfully!');
        
    } catch (error) {
        showSharingError(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Generate Sharing Link';
    }
}

async function loadSharingLinks() {
    try {
        const response = await fetch(`${API_BASE}/sharing/links`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load sharing links');
        }
        
        sharingLinks = await response.json();
        displaySharingLinks();
        
    } catch (error) {
        console.error('Error loading sharing links:', error);
        document.getElementById('sharingLinks').innerHTML = '<p>Error loading sharing links</p>';
    }
}

function displaySharingLinks() {
    const container = document.getElementById('sharingLinks');
    
    if (sharingLinks.length === 0) {
        container.innerHTML = '<p>No sharing links generated yet.</p>';
        return;
    }
    
    const html = sharingLinks.map(link => {
        const createdAt = new Date(link.createdAt).toLocaleDateString();
        const expiresAt = link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never';
        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
        
        return `
            <div class="sharing-link-item ${isExpired ? 'expired' : ''}">
                <div class="sharing-link-info">
                    <div class="sharing-link-url">${link.shareUrl}</div>
                    <div class="sharing-link-date">
                        Created: ${createdAt} | Expires: ${expiresAt}
                        ${isExpired ? ' (Expired)' : ''}
                    </div>
                </div>
                <div class="sharing-link-actions">
                    <button class="copy-btn" onclick="copyToClipboard('${link.shareUrl}')">Copy</button>
                    <button class="delete-btn" onclick="deleteSharingLink('${link.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSharingSuccess('Link copied to clipboard!');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSharingSuccess('Link copied to clipboard!');
    }
}

async function deleteSharingLink(id) {
    if (!confirm('Are you sure you want to delete this sharing link?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sharing/links/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete sharing link');
        }
        
        // Remove the link from the local array immediately
        sharingLinks = sharingLinks.filter(link => link.id !== id);
        displaySharingLinks();
        
        showSharingSuccess('Sharing link deleted successfully!');
        
    } catch (error) {
        showSharingError(error.message);
    }
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/';
}
