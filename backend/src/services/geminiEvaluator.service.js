import { GoogleGenAI } from "@google/genai";

const geminiEvaluator = async ({
  title,
  description,
  sampleInput,
  sampleOutput,
  code,
  language,
}) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const prompt = `
        You are evaluating a student programming assignment submission.

        ASSIGNMENT TITLE:
        ${title}

        ASSIGNMENT DESCRIPTION:
        ${description}

        SAMPLE INPUT:
        ${sampleInput || "Not Provided"}

        SAMPLE OUTPUT:
        ${sampleOutput || "Not Provided"}

        PROGRAMMING LANGUAGE:
        ${language}

        STUDENT CODE:
        ${code}

        TASKS:

        1. Determine whether the solution is:
        - hardcoded
        - partial
        - correct

        Definitions:

        hardcoded:
        - output is manually printed
        - no real implementation
        - solution does not generalize

        partial:
        - genuine implementation exists
        - solves assignment
        - may fail some edge cases
        - not fully robust

        correct:
        - genuine implementation
        - logically sound
        - reasonably generalizable

        2. Give score:
        - hardcoded => 0
        - partial => 8
        - correct => 10

        3. Provide concise feedback.

        4. Provide weaknesses if any.

        5. If category is NOT hardcoded,
        generate exactly 5 MCQs.

        6. If category is hardcoded,
        return an empty MCQ array.

        IMPORTANT:

        Return ONLY raw JSON.

        Do NOT use markdown.
        Do NOT use code fences.
        Do NOT add explanations.
        Do NOT add text before or after JSON.

        RETURN ONLY VALID JSON.

        {
        "category": "hardcoded | partial | correct",
        "score": number,
        "feedback": "string",
        "weaknesses": ["string"],
        "mcqs": [
            {
            "question": "string",
            "options": [
                "string",
                "string",
                "string",
                "string"
            ],
            "answer": "string"
            }
        ]
        }
        `;

  const response = await ai.models.generateContent({
    model: "models/gemini-2.5-flash",
    contents: prompt,
  });

  try {
    const text = response.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini evaluation parsing failed:", error);

    return {
      category: "partial",
      score: 5,
      feedback: "AI evaluation unavailable.",
      weaknesses: [],
      mcqs: [],
    };
  }
};

export default geminiEvaluator;
