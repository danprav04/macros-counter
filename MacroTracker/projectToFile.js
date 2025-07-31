const fs = require('fs');
const path = require('path');

async function generateProjectStructureAndContent(projectRoot, outputFile) {
    const excludedDirs = ['node_modules', '.git', '.expo', 'android', 'ios', '__tests__', 'dist', 'build', '.vscode', 'coverage'];
    const excludedFiles = ['.DS_Store', 'package-lock.json', 'yarn.lock', 'bun.lockb', 'metro.config.js', 'babel.config.js', 'testOtp.txt'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico']; // Add more if needed

    let fileStructureTree = '';  // For the initial tree structure
    let fileContents = '';      // For the file contents

    async function traverseDirectory(dir, indent = '') {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (excludedDirs.includes(entry.name)) {
                continue;
            }

            if (entry.isDirectory()) {
                fileStructureTree += `${indent}${entry.name}/\n`;
                await traverseDirectory(fullPath, indent + '  ');
            } else if (entry.isFile()) {
                if (excludedFiles.includes(entry.name)) {
                    continue;
                }
                fileStructureTree += `${indent}${entry.name}\n`;
                const fileExtension = path.extname(entry.name).toLowerCase();

                if (!imageExtensions.includes(fileExtension)) {
                    fileContents += `\n---------- ${entry.name} ----------\n`;
                    try {
                        const fileContent = await fs.promises.readFile(fullPath, 'utf-8');
                        fileContents += `${fileContent}\n`;
                    } catch (readError) {
                        fileContents += `ERROR READING FILE: ${readError.message}\n`;
                    }
                    fileContents += `---------- END ${entry.name} ----------\n\n`;
                } else {
                     fileContents += `\n---------- ${entry.name} ----------\n`;
                     fileContents += `(Image file - content not included)\n`;
                     fileContents += `---------- END ${entry.name} ----------\n\n`;
                }
            }
        }
    }

    try {
        await traverseDirectory(projectRoot);
        const fullOutput = fileStructureTree + fileContents;

        await fs.promises.writeFile(outputFile, fullOutput);
        console.log(`Project structure and content written to ${outputFile}`);

    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

// --- Main execution ---

const projectRoot = process.cwd(); // Use the current working directory
const outputFile = 'project_structure.txt';

// Check if the projectRoot exists.
fs.stat(projectRoot, (err, stats) => {
    if (err) {
        console.error(`Error: Project root directory "${projectRoot}" not found or not accessible.`);
        process.exit(1);
    }

    if (!stats.isDirectory()) {
        console.error(`Error: "${projectRoot}" is not a directory.`);
        process.exit(1);
    }

    generateProjectStructureAndContent(projectRoot, outputFile);
});