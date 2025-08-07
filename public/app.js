// API endpoints
const API_BASE = 'http://localhost:8000';
const REQUEST_CODE_URL = `${API_BASE}/auth/request`;
const VERIFY_CODE_URL = `${API_BASE}/auth/verify`;

// Store email for verification step
let currentEmail = '';

async function requestCode() {
    const emailInput = document.getElementById('email');
    const errorDiv = document.getElementById('emailError');
    const successDiv = document.getElementById('emailSuccess');
    
    // Reset messages
    errorDiv.textContent = '';
    successDiv.textContent = '';

    const email = emailInput.value.trim();
    if (!email) {
        errorDiv.textContent = 'Please enter an email address';
        return;
    }

    try {
        const response = await fetch(REQUEST_CODE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to request code');
        }

        // Store email for verification step
        currentEmail = email;
        
        // Show success message
        successDiv.textContent = 'Check your email for the login code';
        
        // Show verification form
        document.getElementById('verificationForm').style.display = 'block';
        document.getElementById('code').focus();

    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

async function verifyCode() {
    const codeInput = document.getElementById('code');
    const errorDiv = document.getElementById('verificationError');
    
    // Reset error message
    errorDiv.textContent = '';

    const code = codeInput.value.trim();
    if (!code || code.length !== 6) {
        errorDiv.textContent = 'Please enter a valid 6-digit code';
        return;
    }

    try {
        const response = await fetch(VERIFY_CODE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentEmail,
                code: code
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to verify code');
        }

        const data = await response.json();
        
        // Store the JWT token
        localStorage.setItem('authToken', data.token);
        
        // Redirect to the homepage
        window.location.href = '/home.html';

    } catch (error) {
        errorDiv.textContent = error.message;
    }
}
