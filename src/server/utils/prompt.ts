import * as readline from "readline";

/**
 * Asks a question to the user and returns their response.
 * It uses the readline interface to get input from the command line.
 *
 * @param question - The question to be asked to the user
 * @returns A Promise that resolves with the user's input (trimmed)
 */
export function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin, // Standard input (keyboard)
    output: process.stdout, // Standard output (console)
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close(); // Close the readline interface after the user answers
      resolve(answer.trim()); // Resolve with the user's answer, trimmed of leading/trailing spaces
    })
  );
}
