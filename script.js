const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = window.location.origin;
const SITE_NAME = 'AI Blog Generator';

// Check for cached API key and theme preference on load
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Load API key
        const cachedApiKey = localStorage.getItem('openRouterApiKey');
        if (cachedApiKey) {
            document.getElementById('apiKey').value = cachedApiKey;
        }
        
        // Load theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    } catch (error) {
        console.error('Local storage error:', error);
        alert('Error accessing local storage. Some features may not work properly.');
    }
});

function toggleTheme() {
    try {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme toggle button text
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = `Switch to ${currentTheme === 'dark' ? 'Dark' : 'Light'} Mode`;
    } catch (error) {
        console.error('Theme toggle error:', error);
        alert('Failed to toggle theme');
    }
}

function clearCache() {
    try {
        localStorage.removeItem('openRouterApiKey');
        document.getElementById('apiKey').value = '';
        alert('API key cleared successfully!');
    } catch (error) {
        console.error('Clear cache error:', error);
        alert('Failed to clear cached API key');
    }
}

// Add this function to calculate word count
function getWordCount(text) {
    return text.trim().split(/\s+/).length;
}

// Add these helper functions at the top of the file
function createSegmentPrompt(topic, section, wordCount) {
    const prompts = {
        introduction: `Write a compelling introduction (exactly ${wordCount} words) for an article about "${topic}". 
            Include the main keyword naturally, hook the reader, and outline what the article will cover.
            Format in markdown.`,
            
        mainContent: `Write a detailed main content section (exactly ${wordCount} words) for an article about "${topic}".
            Focus on providing valuable, actionable information with proper H2 and H3 headings.
            Include statistics, examples, and expert insights. Format in markdown.`,
            
        conclusion: `Write a strong conclusion (exactly ${wordCount} words) for an article about "${topic}".
            Summarize key points and include a call to action. Format in markdown.`,
            
        faq: `Write a FAQ section (exactly ${wordCount} words) with 5 common questions and detailed answers about "${topic}".
            Format in markdown with H2 for "Frequently Asked Questions" and each question in H3.`
    };
    
    return prompts[section];
}

// Update the generateBlog function
async function generateBlog() {
    const topic = document.getElementById('topic').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!topic || !apiKey) {
        alert('Please enter both a topic and API key');
        return;
    }

    localStorage.setItem('openRouterApiKey', apiKey);
    
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('blogContent').innerHTML = '';
    document.getElementById('copyButton').style.display = 'none';
    
    startProgressAnimation();

    try {
        // Generate content in segments
        const segments = [
            { type: 'introduction', words: 150 },
            { type: 'mainContent', words: 1600 },
            { type: 'conclusion', words: 150 },
            { type: 'faq', words: 100 }
        ];

        let fullContent = '{start}\n\n';
        let currentProgress = 0;

        for (const segment of segments) {
            const prompt = createSegmentPrompt(topic, segment.type, segment.words);
            const content = await generateSegment(prompt, apiKey);
            fullContent += content + '\n\n';
            
            // Update progress
            currentProgress += (100 / segments.length);
            updateProgress(Math.min(currentProgress, 95));
        }

        // Generate SEO metadata
        const metadataPrompt = `For the article about "${topic}", generate:
            - Focus Keywords: (primary keyword + 2-3 secondary keywords)
            - SEO Title: (50-60 characters, include power word + number)
            - Slug: (3-4 words with main keyword)
            - Meta Description: (150-155 characters, include CTA)
            - Image Alt Text Suggestions: (2-3 examples)`;

        const metadata = await generateSegment(metadataPrompt, apiKey);
        fullContent += '\nSEO Metadata:\n' + metadata + '\n{finish}';

        displayContent(fullContent);
    } catch (error) {
        console.error('Generation Error:', error);
        alert('Error generating content: ' + error.message);
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

// Add this new function to generate each segment
async function generateSegment(prompt, apiKey) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': SITE_URL,
            'X-Title': SITE_NAME,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'google/learnlm-1.5-pro-experimental:free',
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate segment');
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response format from API');
    }

    return data.choices[0].message.content;
}

// Add this function to update progress
function updateProgress(progress) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    progressText.textContent = `${Math.round(progress)}%`;
}

// Update progress animation to show percentage
function startProgressAnimation() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += 1;
        if (progress <= 95) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
            progressText.textContent = `${progress}%`;
        }
    }, 500);

    window.progressInterval = interval;
}

function stopProgressAnimation() {
    clearInterval(window.progressInterval);
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.width = '100%';
    progressBar.setAttribute('aria-valuenow', 100);
    progressText.textContent = '100%';
    
    setTimeout(() => {
        progressBar.style.width = '0%';
        progressBar.style.display = 'none';
        progressText.textContent = '';
    }, 500);
}

// Update displayContent function to show word count
function displayContent(content) {
    stopProgressAnimation();
    const blogContent = document.getElementById('blogContent');
    const seoMetadata = document.getElementById('seoMetadata');
    const wordCountElement = document.getElementById('wordCount');
    
    // Split content into main article and metadata
    const parts = content.split('SEO Metadata:');
    const articleContent = parts[0];
    const metadata = parts[1] || '';

    // Calculate word count
    const wordCount = getWordCount(articleContent);
    
    // Display word count with appropriate styling
    wordCountElement.textContent = `Word Count: ${wordCount} words`;
    wordCountElement.className = 'word-count';
    
    if (Math.abs(wordCount - 2000) > 100) {
        wordCountElement.classList.add('warning');
    } else {
        wordCountElement.classList.add('success');
    }

    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false,
        sanitize: false
    });

    // Display main article content
    try {
        blogContent.innerHTML = marked.parse(articleContent);
    } catch (error) {
        console.error('Markdown parsing error:', error);
        blogContent.innerHTML = articleContent; // Fallback to plain text
    }

    // Parse and display metadata
    const metadataLines = metadata.split('\n').filter(line => line.trim());
    const metadataHtml = metadataLines.map(line => `<div>${line}</div>`).join('');
    seoMetadata.innerHTML = `<h3>SEO Metadata</h3>${metadataHtml}`;

    // Show copy button
    document.getElementById('copyButton').style.display = 'block';
}

function copyContent() {
    const blogContent = document.getElementById('blogContent').innerText;
    const seoMetadata = document.getElementById('seoMetadata').innerText;
    
    const fullContent = `${blogContent}\n\n${seoMetadata}`;
    
    navigator.clipboard.writeText(fullContent)
        .then(() => alert('Content copied to clipboard!'))
        .catch(err => alert('Failed to copy content: ' + err));
} 
