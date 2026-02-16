
import { GoogleGenAI, Type } from "@google/genai";
import { WikiData } from "../types";

export class GeminiService {
  static async generateWiki(repoInfo: any, fileTree: string, keyFiles: Record<string, string>): Promise<WikiData> {
    // Always initialize GoogleGenAI inside the method call to use the current API_KEY from the environment
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are an expert technical writer and developer advocate. 
      Your task is to build a complete, professional Wiki for the following GitHub repository.
      
      REPOSITORY DETAILS:
      Name: ${repoInfo.name}
      Description: ${repoInfo.description || 'No description provided'}
      
      FILE STRUCTURE:
      ${fileTree}
      
      KEY FILE CONTENTS (Snippets/Full):
      ${Object.entries(keyFiles).map(([path, content]) => `--- FILE: ${path} ---\n${content.slice(0, 3000)}`).join('\n\n')}
      
      INSTRUCTIONS:
      1. Analyze the project structure and contents to understand its purpose, installation, usage, and architecture.
      2. Generate a structured Wiki with multiple pages:
         - "Home": High-level overview, badges, and quick links.
         - "Installation": Detailed setup steps.
         - "Usage": Practical examples and how to run the project.
         - "API Reference" or "Architecture": Technical deep dive based on source code.
         - "Contributing": How others can help.
      3. ENHANCED FORMATTING & NAVIGATION:
         - Use GitHub Flavored Markdown (tables, task lists, bold/italics).
         - USE LaTeX for ANY mathematical concepts, algorithms, or complex logic definitions (e.g., $E = mc^2$ or block equations using $$).
         - IMPORTANT: Use internal links to link between wiki pages. Use the page IDs (kebab-case) as the link targets. 
           Example: [Check the Installation guide](installation) or [See the Usage section](usage).
         - Include clear headers and callouts (blockquotes) for important warnings or tips.
         - Ensure code blocks have correct language tags for syntax highlighting.
      4. Ensure the content is accurate to the code provided.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 15000 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING },
            description: { type: Type.STRING },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Kebab-case ID for the page" },
                  title: { type: Type.STRING },
                  content: { type: Type.STRING, description: "Full Markdown content for the page" },
                  icon: { type: Type.STRING, description: "A simple Emoji representating the page topic" }
                },
                required: ["id", "title", "content"]
              }
            }
          },
          required: ["projectName", "description", "pages"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as WikiData;
  }
}
