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

async function generateBlog() {
    const topic = document.getElementById('topic').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!topic || !apiKey) {
        alert('Please enter both a topic and API key');
        return;
    }

    // Cache the API key
    localStorage.setItem('openRouterApiKey', apiKey);

    // Show loading spinner and progress bar
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('blogContent').innerHTML = '';
    document.getElementById('copyButton').style.display = 'none';

    // Start progress animation
    startProgressAnimation();

    const prompt = `I want you to act as an expert SEO content writer to create a 2000-word, 100% unique, SEO-optimized, and human-written article in casual English on the topic: "${topic}". The article should:

    Headings Structure:
    Include at least 15 headings and subheadings (H1, H2, H3, and H4 levels).
    Bold all titles and headings.

    Formatting:
    Use markdown formatting.
    Start the article with {start} tags and end with {finish} tags.

    Writing Style:
    Use conversational English that feels engaging and personal.
    Keep the tone informal yet professional, utilizing personal pronouns, rhetorical questions, analogies, and metaphors.
    Incorporate rich, detailed paragraphs while maintaining brevity and avoiding redundancy.

    SEO Elements:
    Integrate focus keywords naturally (6 words max) throughout the content.
    Ensure high perplexity and burstiness without losing specificity or context.
    Follow RankMath SEO guidelines for optimal keyword placement.
    Use bullet points, numbered lists, and other scannable formats when appropriate.

    Conclusion & FAQs:
    Include a conclusion paragraph summarizing the key takeaways.
    Add 5 unique FAQs with detailed answers at the end of the article.

    SEO Metadata:
    After the article, provide the following:
    Focus Keywords: SEO-friendly keywords (6 words max).
    SEO Title: SEO-friendly title (60 characters max) starting with the focus keywords.
    Slug: SEO-friendly slug (15 characters max) including focus keywords.
    Meta Description: SEO-friendly description (155 characters max) including focus keywords.
    Alt Text for Images: Descriptive alt text that represents the content, mood, or theme of the article.`;

    try {
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
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate content');
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0]?.message?.content) {
            throw new Error('Invalid response format from API');
        }

        const generatedContent = data.choices[0].message.content;
        displayContent(generatedContent);
    } catch (error) {
        console.error('API Error:', error);
        alert('Error generating content: ' + error.message);
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
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

// Update displayContent function to stop progress animation
function displayContent(content) {
    stopProgressAnimation();
    const blogContent = document.getElementById('blogContent');
    const seoMetadata = document.getElementById('seoMetadata');
    
    // Split content into main article and metadata
    const parts = content.split('SEO Metadata:');
    const articleContent = parts[0];
    const metadata = parts[1] || '';

    // Configure marked options
    marked.setOptions({
        breaks: true,        // Add line breaks
        gfm: true,          // Enable GitHub Flavored Markdown
        headerIds: true,    // Add IDs to headers
        mangle: false,      // Don't escape HTML
        sanitize: false     // Don't sanitize HTML
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
