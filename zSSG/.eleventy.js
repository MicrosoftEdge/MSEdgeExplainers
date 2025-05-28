const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const markdownIt = require('markdown-it');

module.exports = function(eleventyConfig) {
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true
  });

  eleventyConfig.addCollection('explainers', function(collectionApi) {
    const explainers = [];
    
    // TODO: This feels hacky, but I couldn't get it to work right in a small amount of time.
    const explainerFiles = glob.sync('../*/*.md', { 
      cwd: __dirname,
      absolute: true 
    });
    
    explainerFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(content);
        
        if (parsed.data.tags && parsed.data.tags.includes('explainer')) {
            const folderName = path.basename(path.dirname(filePath));

            const explainer = {
            data: {
                title: parsed.data.title || folderName,
                description: parsed.data.description || '',
                tags: parsed.data.tags,
                ...parsed.data
            },
            content: parsed.content,
            renderedContent: md.render(parsed.content),
            url: `/${folderName}/`,
            inputPath: filePath,
            outputPath: `_site/${folderName}/index.html`,
            fileSlug: folderName,
            filePathStem: `/${folderName}/index`
            };
            
            explainers.push(explainer);
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    });
    
    return explainers;
  
  });

  //TODO: Images
  eleventyConfig.addPassthroughCopy("_includes/*.css");
  
  return {
    dir: {
      input: '.',
      includes: '_includes',
      data: '_data',
      output: '_site'
    },
  };
};