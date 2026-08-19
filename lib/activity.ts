import { ActivityType } from "@prisma/client";

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Coaching Call",
  PROSPECTING: "Prospecting",
  CLOSE: "Close",
  REFERRAL_SENT: "Referral Sent",
  FOLLOW_UP: "Follow-up",
  CHECK_IN: "Check-in",
  PLANNING: "Planning",
  TRAINING: "Training",
};
