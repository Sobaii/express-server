var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
export function analyzeFile(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Extract from the first receipt you see: transactionDate, company, total, subtotal, totalTax, vendorPhone, street, gratuity, city, state, country, zipCode, and category. Be very meticulous about categorizing this receipt into one of the following categories: ${categories.join(", ")}. Return the result as plain JSON. Do not include any markdown or code blocks. Date format: YYYY-MM-DD. Ensure number values are numbers, not strings. No additional text.`,
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
        }
        catch (error) {
            console.error("Error analyzing receipt:", error);
            throw error;
        }
    });
}
function cleanAndParseJSON(jsonString) {
    const cleanedString = jsonString
        .replace(/\\n/g, "") // Remove \n (newline)
        .replace(/\\"/g, '"'); // Replace escaped quotes with regular quotes
    try {
        const jsonObject = JSON.parse(cleanedString);
        return jsonObject;
    }
    catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
    }
}
