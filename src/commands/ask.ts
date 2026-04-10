import type { Command } from 'commander';

export function registerAskCommand(program: Command): void {
  program
    .command('ask <question...>')
    .description('Ask a natural language question about cross-chain operations (experimental)')
    .action(async (questionParts) => {
      const question = questionParts.join(' ');
      console.log(`\n  [Experimental] You asked: "${question}"\n`);
      console.log('  The "ask" command requires an LLM API key.');
      console.log('  Configure with: lifi auth set-llm <provider> <api-key>');
      console.log('  This feature is coming soon.\n');
    });
}
