const DEFAULT_TEMPLATES: Record<string, string> = {
  pot_milestone:
    "The pot just crossed {milestone} SOL! Currently at {pot} SOL with {players} crabs in the game. Will you be the last claw standing?",
  timer_drama:
    "FINAL SECONDS! Only {seconds}s left on the clock! {lastBuyer} is about to win {prize} SOL! Will anyone snipe?",
  round_start:
    "A new molt begins! Round #{round} is live. First claw costs just {price} SOL. Early crabs earn the fattest scraps.",
  round_end:
    "Round #{round} is OVER! {winner} claims {prize} SOL! {totalKeys} claws were grabbed by {players} crabs.",
  hourly_summary:
    "Hourly update: Round #{round} | Pot: {pot} SOL | Players: {players} | Keys: {totalKeys} | Price: {price} SOL | Status: {phase}",
  daily_recap:
    "Daily recap: Round #{round} | Pot: {pot} SOL | {players} crabs holding {totalKeys} claws | Dividends distributed: {dividends} SOL | Last buyer: {lastBuyer}",
};

export function renderTemplate(
  templateName: string,
  data: Record<string, unknown>,
): string {
  const template = DEFAULT_TEMPLATES[templateName];
  if (!template) {
    return `[Unknown template: ${templateName}] ${JSON.stringify(data)}`;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return `{${key}}`;
    }
    return String(value);
  });
}

export function getDefaultTemplates(): Record<string, string> {
  return { ...DEFAULT_TEMPLATES };
}
