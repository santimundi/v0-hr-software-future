/**
 * Utility functions for reading file contents in the browser
 * Supports PDF and text files
 */

/**
 * Reads text from a PDF file
 */
async function readPDF(file: File): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist")
    
    // Set worker source - use a CDN or local worker
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const textParts: string[] = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => (item as any).str)
        .join(" ")
      textParts.push(pageText)
    }
    
    return textParts.join("\n\n")
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Reads text from a text file
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      resolve(text)
    }
    reader.onerror = () => {
      reject(new Error("Failed to read text file"))
    }
    reader.readAsText(file)
  })
}

/**
 * Reads text content from a file (PDF or text)
 * @param file - The file to read
 * @returns The extracted text content
 */
export async function readFileContent(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith(".pdf")) {
    return readPDF(file)
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    return readTextFile(file)
  } else {
    throw new Error("Unsupported file type. Only PDF and text files are supported.")
  }
}

/**
 * Validates if a file is a supported type (PDF or text)
 */
export function isSupportedFileType(file: File): boolean {
  const fileName = file.name.toLowerCase()
  return fileName.endsWith(".pdf") || fileName.endsWith(".txt") || fileName.endsWith(".md")
}

