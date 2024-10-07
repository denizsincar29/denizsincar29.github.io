// Initialize Showdown
const converter = new showdown.Converter();

// Fetch the vote.md content
fetch('vote.md')
  .then(response => response.text())
  .then(data => {
    // Render the Markdown content using Showdown
    const renderedContent = converter.makeHtml(data);
    document.getElementById('vote-content').innerHTML = renderedContent;
  })
  .catch(error => {
    console.error("Error fetching vote.md:", error);
    document.getElementById('vote-content').innerHTML = "Failed to load vote.md";
  });

// Add download functionality
const downloadButton = document.getElementById('download-btn');
downloadButton.addEventListener('click', () => {
  // Create a download link
  const link = document.createElement('a');
  link.href = 'vote.md';
  link.download = 'vote.md';

  // Trigger a click event on the link to initiate download
  link.click();
});

