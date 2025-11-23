// Environment variables loader for client-side
// This file should be included before script.js in the HTML

// Simple .env parser
function parseEnvFile(envContent) {
    const env = {};
    const lines = envContent.split('\n');
    
    for (const line of lines) {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
            continue;
        }
        
        // Parse KEY=VALUE format
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            env[key] = value;
        }
    }
    
    return env;
}

// Load environment variables
async function loadEnv() {
    try {
        const response = await fetch('.env');
        if (response.ok) {
            const envContent = await response.text();
            return parseEnvFile(envContent);
        }
    } catch (error) {
        console.warn('Could not load .env file:', error);
    }
    
    // Fallback: try to read from global window object if env.js was served with variables
    return window.ENV || {};
}

// Load environment variables immediately
const ENV = {};

// Create a fallback environment for development
ENV.SECRET_KEY = 'IceEncrypt2025SecretKey!'; // Fallback for development

// Make ENV available globally
window.ENV = ENV;

// Function to get environment variable
window.getEnvVar = function(key, defaultValue = null) {
    return window.ENV[key] || defaultValue;
};