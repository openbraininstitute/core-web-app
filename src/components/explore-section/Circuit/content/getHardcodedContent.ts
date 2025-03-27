
import { promises as fs } from 'fs';

async function getHardcodedContent(filePath: string): Promise<object[]> {
    try {
        // Check if filePath is provided and is a string
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path provided');
        }

        // Read the file content
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // Parse the JSON content
        const jsonData = JSON.parse(fileContent);

        // Transform to array based on content type
        if (Array.isArray(jsonData)) {
            return jsonData;
        }
        
        if (typeof jsonData === 'object' && jsonData !== null) {
            return [jsonData];
        }

        return [];
    } catch (error) {
        console.error('Error processing JSON file:', error);
        return [];
    }
}

export default getHardcodedContent;