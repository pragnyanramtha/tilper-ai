import { type IStorage } from "./storage";
import { type InsertChallenge } from "@shared/schema";

const seedChallenges = [
  {
    title: "Hello World",
    description: "Write a function that returns the string 'Hello, World!'. This is the classic first program every developer writes. Get familiar with the code editor and how to write and test your code.",
    difficulty: "Beginner",
    topic: "Fundamentals",
    starterCode: `function helloWorld() {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(helloWorld());`,
    solution: `function helloWorld() {\n  return "Hello, World!";\n}`,
    hints: [
      "Use the return keyword to send back a value from the function",
      "Strings can be wrapped in single quotes or double quotes",
      "Make sure to return the exact string: Hello, World!"
    ],
    testCases: JSON.stringify([
      { name: "Returns correct string", input: [], expected: "Hello, World!" }
    ]),
    order: 1,
  },
  {
    title: "Sum Two Numbers",
    description: "Write a function called 'add' that takes two numbers as parameters and returns their sum. This challenge will help you understand function parameters and basic arithmetic operations.",
    difficulty: "Beginner",
    topic: "Fundamentals",
    starterCode: `function add(a, b) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(add(2, 3));\nconsole.log(add(-1, 5));`,
    solution: `function add(a, b) {\n  return a + b;\n}`,
    hints: [
      "The + operator adds two numbers together",
      "Use the return keyword to output the result",
      "The parameters a and b already contain the numbers passed to the function"
    ],
    testCases: JSON.stringify([
      { name: "Adds positive numbers", input: [2, 3], expected: 5 },
      { name: "Handles negative numbers", input: [-1, 5], expected: 4 },
      { name: "Adds zeros", input: [0, 0], expected: 0 }
    ]),
    order: 2,
  },
  {
    title: "Even or Odd",
    description: "Write a function called 'isEven' that takes a number and returns true if it is even, and false if it is odd. Learn about the modulo operator and boolean values.",
    difficulty: "Beginner",
    topic: "Fundamentals",
    starterCode: `function isEven(number) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(isEven(4));\nconsole.log(isEven(7));`,
    solution: `function isEven(number) {\n  return number % 2 === 0;\n}`,
    hints: [
      "The modulo operator (%) returns the remainder of a division",
      "A number is even if dividing by 2 gives a remainder of 0",
      "Use === for strict equality comparison"
    ],
    testCases: JSON.stringify([
      { name: "4 is even", input: [4], expected: true },
      { name: "7 is odd", input: [7], expected: false },
      { name: "0 is even", input: [0], expected: true }
    ]),
    order: 3,
  },
  {
    title: "Reverse a String",
    description: "Write a function called 'reverseString' that takes a string as input and returns the string reversed. For example, 'hello' becomes 'olleh'. Practice working with strings and array methods.",
    difficulty: "Beginner",
    topic: "Strings",
    starterCode: `function reverseString(str) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(reverseString("hello"));\nconsole.log(reverseString("CodeQuest"));`,
    solution: `function reverseString(str) {\n  return str.split("").reverse().join("");\n}`,
    hints: [
      "You can convert a string to an array of characters with .split('')",
      "Arrays have a .reverse() method that reverses them in place",
      "Use .join('') to convert the array back to a string"
    ],
    testCases: JSON.stringify([
      { name: "Reverses hello", input: ["hello"], expected: "olleh" },
      { name: "Reverses CodeQuest", input: ["CodeQuest"], expected: "tseuQedoC" },
      { name: "Handles single char", input: ["a"], expected: "a" }
    ]),
    order: 4,
  },
  {
    title: "Find Maximum",
    description: "Write a function called 'findMax' that takes an array of numbers and returns the largest number. Learn how to iterate through arrays and compare values.",
    difficulty: "Intermediate",
    topic: "Arrays",
    starterCode: `function findMax(numbers) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(findMax([3, 7, 1, 9, 4]));\nconsole.log(findMax([-5, -2, -8]));`,
    solution: `function findMax(numbers) {\n  let max = numbers[0];\n  for (let i = 1; i < numbers.length; i++) {\n    if (numbers[i] > max) {\n      max = numbers[i];\n    }\n  }\n  return max;\n}`,
    hints: [
      "Start by assuming the first element is the maximum",
      "Loop through each element and compare it to your current maximum",
      "You can also use Math.max(...numbers) as a shortcut"
    ],
    testCases: JSON.stringify([
      { name: "Finds max in positive array", input: [[3, 7, 1, 9, 4]], expected: 9 },
      { name: "Handles negative numbers", input: [[-5, -2, -8]], expected: -2 },
      { name: "Single element", input: [[42]], expected: 42 }
    ]),
    order: 5,
  },
  {
    title: "Count Vowels",
    description: "Write a function called 'countVowels' that takes a string and returns the number of vowels (a, e, i, o, u) in it. Case should not matter - both 'A' and 'a' count.",
    difficulty: "Intermediate",
    topic: "Strings",
    starterCode: `function countVowels(str) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(countVowels("hello"));\nconsole.log(countVowels("CodeQuest"));`,
    solution: `function countVowels(str) {\n  const vowels = "aeiouAEIOU";\n  let count = 0;\n  for (const char of str) {\n    if (vowels.includes(char)) {\n      count++;\n    }\n  }\n  return count;\n}`,
    hints: [
      "Create a string or array containing all vowels",
      "Loop through each character in the input string",
      "Use .toLowerCase() to handle case insensitivity"
    ],
    testCases: JSON.stringify([
      { name: "Counts vowels in hello", input: ["hello"], expected: 2 },
      { name: "Counts vowels in CodeQuest", input: ["CodeQuest"], expected: 4 },
      { name: "No vowels", input: ["rhythm"], expected: 0 }
    ]),
    order: 6,
  },
  {
    title: "FizzBuzz",
    description: "Write a function called 'fizzBuzz' that takes a number n and returns an array of strings from 1 to n where: multiples of 3 are 'Fizz', multiples of 5 are 'Buzz', multiples of both are 'FizzBuzz', and other numbers are converted to strings.",
    difficulty: "Intermediate",
    topic: "Logic",
    starterCode: `function fizzBuzz(n) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(fizzBuzz(15));`,
    solution: `function fizzBuzz(n) {\n  const result = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 3 === 0 && i % 5 === 0) {\n      result.push("FizzBuzz");\n    } else if (i % 3 === 0) {\n      result.push("Fizz");\n    } else if (i % 5 === 0) {\n      result.push("Buzz");\n    } else {\n      result.push(String(i));\n    }\n  }\n  return result;\n}`,
    hints: [
      "Check for divisibility by both 3 AND 5 first, before checking individually",
      "Use the modulo operator (%) to check divisibility",
      "Push results into an array and return it"
    ],
    testCases: JSON.stringify([
      { name: "FizzBuzz at 15", input: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] },
      { name: "Includes FizzBuzz", input: [15], expected: "includes_FizzBuzz" }
    ]),
    order: 7,
  },
  {
    title: "Palindrome Checker",
    description: "Write a function called 'isPalindrome' that checks if a given string is a palindrome (reads the same forwards and backwards). Ignore case and spaces.",
    difficulty: "Advanced",
    topic: "Strings",
    starterCode: `function isPalindrome(str) {\n  // Write your code here\n  \n}\n\n// Test your function\nconsole.log(isPalindrome("racecar"));\nconsole.log(isPalindrome("hello"));\nconsole.log(isPalindrome("A man a plan a canal Panama"));`,
    solution: `function isPalindrome(str) {\n  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");\n  return cleaned === cleaned.split("").reverse().join("");\n}`,
    hints: [
      "First, clean the string by removing spaces and converting to lowercase",
      "Compare the cleaned string with its reversed version",
      "Use regex to remove non-alphanumeric characters"
    ],
    testCases: JSON.stringify([
      { name: "racecar is palindrome", input: ["racecar"], expected: true },
      { name: "hello is not palindrome", input: ["hello"], expected: false },
      { name: "Handles spaces and case", input: ["A man a plan a canal Panama"], expected: true }
    ]),
    order: 8,
  },
];

export async function seedDatabase(storage: IStorage) {
  const existing = await storage.getChallenges();
  if (existing.length > 0) {
    return;
  }

  console.log("Seeding database with challenges...");
  for (const challenge of seedChallenges) {
    await storage.createChallenge({
      title: challenge.title,
      description: challenge.description,
      difficulty: challenge.difficulty,
      topic: challenge.topic,
      starterCode: challenge.starterCode,
      solution: challenge.solution,
      hints: challenge.hints as any, // Cast to any to bypass text[].array() mismatch if needed
      testCases: JSON.parse(challenge.testCases),
      order: challenge.order,
      language: "javascript",
      generatedBy: "seed",
      sessionId: null,
      planId: null,
    } as any);
  }
  console.log(`Seeded ${seedChallenges.length} challenges`);

  // Seed a dummy conversation if none exist for a "demo-session"
  const demoSessionId = "demo-session";
  const existingConversations = await storage.getConversations(demoSessionId);
  if (existingConversations.length === 0) {
    console.log("Seeding dummy conversation...");
    const conversation = await storage.createConversation({
      sessionId: demoSessionId,
      title: "Welcome to Tilper AI!",
    } as any);
    await storage.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "Hello! I'm your Tilper AI mentor. I can help you learn to code with personalized challenges, visual explanations, and interactive guidance. What would you like to explore today?",
    } as any);
    console.log("Seeded dummy conversation.");
  }
}
