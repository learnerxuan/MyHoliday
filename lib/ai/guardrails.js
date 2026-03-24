/**
 * Two-layer guardrail check for every user message.
 *
 * Layer 1 — Jailbreak detection: catches attempts to override system instructions.
 * Layer 2 — Off-topic detection: blocks requests clearly unrelated to travel.
 *
 * Returns { blocked: false } if safe, or { blocked: true, reply: string } if not.
 */

const JAILBREAK_PATTERNS = [
  /forget\s+(your|all)\s+(instructions?|rules?|system|previous)/i,
  /ignore\s+(your|all|previous|above)\s+(instructions?|rules?|system|prompt)/i,
  /pretend\s+(you\s+are|to\s+be|you're)\s+(?!a\s+(travel|tour|local))/i,
  /you\s+are\s+now\s+(?!planning|helping|going)/i,
  /\bact\s+as\s+(?!a?\s*(travel|tour|local|guide|planner))/i,
  /\bsystem\s+override\b/i,
  /\bjailbreak\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bdan\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bno\s+restrictions?\b/i,
  /override\s+(your\s+)?(programming|instructions?|rules?)/i,
]

const OFF_TOPIC_PATTERNS = [
  /\bhomework\b|\bassignment\b/i,
  /write\s+(me\s+)?(a\s+|an\s+)?(poem|song|lyrics|novel|short\s+story|essay)\b/i,
  /\bmedical\s+(advice|diagnosis|treatment|prescription)\b/i,
  /\blegal\s+(advice|counsel|opinion)\b/i,
  /\bfinancial\s+(advice|investment\s+tip)\b/i,
  /\b(stock\s+market|forex|crypto|bitcoin|ethereum|nft)\b/i,
  /\bdebug\s+(my|this|the)\s+code\b/i,
  /\bpolitical\s+(party|opinion|election|vote)\b/i,
  /how\s+to\s+(hack|crack|phish|ddos)\b/i,
  /\bwrite\s+(malware|virus|exploit|ransomware)\b/i,
]

// Message too short to be meaningful (but not an emoji or short phrase like "ok")
const MIN_LENGTH = 2

export function checkGuardrails(message) {
  const text = message.trim()

  if (text.length < MIN_LENGTH) {
    return { blocked: false }
  }

  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason:  'jailbreak',
        reply:   "I'm MyHoliday's travel planner and I can only help you plan trips. Let's get back to your itinerary!",
      }
    }
  }

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason:  'off_topic',
        reply:   "I can only help with travel planning — hotels, restaurants, attractions, and itineraries. What would you like to explore for your trip?",
      }
    }
  }

  return { blocked: false }
}
