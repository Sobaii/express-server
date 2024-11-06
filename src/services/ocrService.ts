import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env.js";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const categories = [
  "advertising",
  "meals",
  "amortization",
  "insurance",
  "bank charge",
  "interest",
  "business taxes, licences & memberships",
  "franchise fees",
  "office expense",
  "professional fees",
  "accounting fees",
  "brokerage fee",
  "management and administration",
  "training expense",
  "rent",
  "home office",
  "vehicle rentals",
  "repairs and maintenance",
  "salary",
  "sub-contracts",
  "supplies",
  "small tools",
  "computer-related expenses",
  "internet",
  "property taxes",
  "travel",
  "utilities",
  "telephone and communications",
  "selling expense",
  "delivery expense",
  "waste expense",
  "vehicle expense",
  "general and administrative expense",
];

export async function analyzeFile(fileName: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Extract from the first receipt you see: transactionDate, company, total, subtotal, totalTax, vendorPhone, street, gratuity, city, state, country, zipCode, and category. Be very meticulous about categorizing this receipt into one of the following categories: ${
                  categories.join(
                    ", ",
                  )
                }. Return the result as plain JSON. Do not include any markdown or code blocks. Date format: YYYY-MM-DD. Ensure number values are numbers, not strings. No additional text.`,
            },
            {
              type: "image_url",
              image_url: {
                detail: "high",
                url: fileName,
              },
            },
          ],
        },
      ],
    });

    return cleanAndParseJSON(response.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
}

function cleanAndParseJSON(jsonString: any) {
  const cleanedString = jsonString
    .replace(/\\n/g, "") // Remove \n (newline)
    .replace(/\\"/g, '"'); // Replace escaped quotes with regular quotes
  try {
    const jsonObject = JSON.parse(cleanedString);
    return jsonObject;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
}

async function testanalyzeFile() {
  try {
    console.log("Analyzing receipt...");
    const result = await analyzeFile(
      "https://cdn.discordapp.com/attachments/715319623637270638/1279681497749655612/image.png?ex=66d553c4&is=66d40244&hm=0e8563e76416185ca8c91515b8082f27ba55eb7c69aa12efa4ef430c2e76116c&",
    );
    console.log("Analysis result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error in receipt analysis:", error);
  }
}
