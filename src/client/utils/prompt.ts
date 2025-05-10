// src/client/utils/prompt.ts
import * as readline from "readline";

/**
 * Membuat interface readline untuk input pengguna
 */
export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Menampilkan prompt dan mendapatkan input dari pengguna
 */
export function promptUser(
  rl: readline.Interface,
  prompt: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Menangani input baris dari pengguna
 */
export function setupLineHandler(
  rl: readline.Interface,
  handler: (input: string) => void
): void {
  rl.on("line", handler);
}

/**
 * Membersihkan baris saat ini dan memindahkan kursor ke awal baris
 */
export function clearCurrentLine(): void {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

/**
 * Menampilkan prompt pesan
 */
export function displayMessagePrompt(): void {
  process.stdout.write("#> ");
}
