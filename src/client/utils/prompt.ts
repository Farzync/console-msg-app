import * as readline from "readline";

/**
 * Creates a readline interface for user input.
 * This interface is used to interact with the command line for input and output.
 */
export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin, // Standard input (keyboard input)
    output: process.stdout, // Standard output (console output)
  });
}

/**
 * Displays a prompt to the user and gets the input.
 * Returns the input as a Promise that resolves with the user's answer.
 *
 * @param rl - The readline interface used for communication with the user
 * @param prompt - The message shown to the user asking for input
 * @returns A Promise that resolves with the user's trimmed input
 */
export function promptUser(
  rl: readline.Interface,
  prompt: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim()); // Remove any leading/trailing spaces
    });
  });
}

/**
 * Sets up a handler for each line of input entered by the user.
 * Whenever the user enters a line, the handler function is invoked.
 *
 * @param rl - The readline interface
 * @param handler - A function that processes each line of user input
 */
export function setupLineHandler(
  rl: readline.Interface,
  handler: (input: string) => void
): void {
  rl.on("line", handler); // Trigger the handler for each line of input
}

/**
 * Clears the current line in the terminal and moves the cursor back to the start of the line.
 * This can be used to overwrite the current line with new content.
 */
export function clearCurrentLine(): void {
  process.stdout.clearLine(0); // Clear the line
  process.stdout.cursorTo(0); // Move the cursor back to the beginning of the line
}

/**
 * Displays a simple prompt message (`#> `) to indicate that the system is ready for input.
 */
export function displayMessagePrompt(): void {
  process.stdout.write("#> "); // Print the prompt to the console
}
