import type { GreetingResult, TimeOfDay } from "@/lib/types";

/**
 * Date から時間帯を判定し、挨拶メッセージを返す純粋関数。
 * 副作用なし・テスト容易。
 */
export function resolveGreeting(now: Date): GreetingResult {
  const hour = now.getHours();

  let timeOfDay: TimeOfDay;
  let message: string;

  if (hour < 10) {
    timeOfDay = "morning";
    message = "おはようございます。";
  } else if (hour < 16) {
    timeOfDay = "afternoon";
    message = "こんにちは。";
  } else if (hour < 20) {
    timeOfDay = "evening";
    message = "こんばんは。";
  } else {
    timeOfDay = "night";
    message = "おやすみなさい。";
  }

  return { timeOfDay, message };
}
